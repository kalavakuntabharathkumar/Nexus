from datetime import date, datetime, timedelta, timezone
from typing import Any, Generator, Optional, Type

import bcrypt
from auth_config import load_secret_key
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import Boolean, Date, DateTime, Float, Integer, String, create_engine, func
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker


DATABASE_URL = "sqlite:///./enterprise_os.db"
SECRET_KEY = load_secret_key()
ALGORITHM = "HS256"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
security = HTTPBearer(auto_error=False)


class Base(DeclarativeBase):
    pass


class Timestamped:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )


class User(Timestamped, Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(180), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="employee")


class Employee(Timestamped, Base):
    __tablename__ = "employees"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(120))
    department: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(20), default="active")
    location: Mapped[str] = mapped_column(String(120))
    joined_date: Mapped[str] = mapped_column(String(30))


class Deal(Timestamped, Base):
    __tablename__ = "deals"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company: Mapped[str] = mapped_column(String(140))
    contact: Mapped[str] = mapped_column(String(120))
    value: Mapped[float] = mapped_column(Float)
    stage: Mapped[str] = mapped_column(String(40))
    probability: Mapped[int] = mapped_column(Integer)
    owner: Mapped[str] = mapped_column(String(120))


class Project(Timestamped, Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(140))
    team_size: Mapped[int] = mapped_column(Integer)
    progress: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20))
    due_date: Mapped[str] = mapped_column(String(30))
    tasks_done: Mapped[int] = mapped_column(Integer)
    tasks_total: Mapped[int] = mapped_column(Integer)


class InventoryItem(Timestamped, Base):
    __tablename__ = "inventory_items"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sku: Mapped[str] = mapped_column(String(60), unique=True)
    name: Mapped[str] = mapped_column(String(140))
    category: Mapped[str] = mapped_column(String(80))
    stock: Mapped[int] = mapped_column(Integer)
    reorder_threshold: Mapped[int] = mapped_column(Integer)
    price: Mapped[float] = mapped_column(Float)
    supplier: Mapped[str] = mapped_column(String(140))


class Transaction(Timestamped, Base):
    __tablename__ = "transactions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    description: Mapped[str] = mapped_column(String(180))
    category: Mapped[str] = mapped_column(String(80))
    amount: Mapped[float] = mapped_column(Float)
    date: Mapped[str] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(20))


class Workflow(Timestamped, Base):
    __tablename__ = "workflows"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(140))
    trigger: Mapped[str] = mapped_column(String(140))
    run_count: Mapped[int] = mapped_column(Integer)
    success_rate: Mapped[float] = mapped_column(Float)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    role: str


class ResourcePayload(BaseModel):
    model_config = ConfigDict(extra="allow")


class CopilotRequest(BaseModel):
    question: str = Field(min_length=1, max_length=500)


def db_session() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_token(user: User) -> str:
    expires = datetime.now(timezone.utc) + timedelta(hours=12)
    return jwt.encode({"sub": str(user.id), "role": user.role, "exp": expires}, SECRET_KEY, algorithm=ALGORITHM)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(db_session),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub", "0"))
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_roles(*roles: str):
    def dependency(user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="You do not have permission for this action")
        return user

    return dependency


def serialize(row: Any) -> dict[str, Any]:
    data = {column.name: getattr(row, column.name) for column in row.__table__.columns}
    for key in ("created_at", "updated_at"):
        if isinstance(data.get(key), datetime):
            data[key] = data[key].isoformat()
    return data


def seed_database() -> None:
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.query(User).count():
            return
        demo_password = hash_password("demo123")
        db.add_all(
            [
                User(name="Avery Morgan", email="admin@demo.com", password_hash=demo_password, role="admin"),
                User(name="Jordan Lee", email="manager@demo.com", password_hash=demo_password, role="manager"),
                User(name="Taylor Reed", email="employee@demo.com", password_hash=demo_password, role="employee"),
            ]
        )
        db.add_all(
            [
                Employee(name="Sarah Chen", role="Senior Engineer", department="Engineering", status="active", location="San Francisco", joined_date="Mar 2021"),
                Employee(name="Marcus Thompson", role="Product Manager", department="Product", status="active", location="New York", joined_date="Jan 2022"),
                Employee(name="Priya Sharma", role="UX Designer", department="Design", status="remote", location="Austin", joined_date="Jun 2021"),
                Employee(name="Lucas Mendes", role="Sales Director", department="Sales", status="leave", location="Chicago", joined_date="Sep 2020"),
                Employee(name="Nina Patel", role="Finance Analyst", department="Finance", status="active", location="Boston", joined_date="Feb 2023"),
                Employee(name="Ethan Williams", role="Operations Lead", department="Operations", status="active", location="Seattle", joined_date="Nov 2022"),
            ]
        )
        db.add_all(
            [
                Deal(company="Orion Systems", contact="Maya Patel", value=87200, stage="Closed Won", probability=100, owner="Marcus Thompson"),
                Deal(company="Vertex Labs", contact="Noah Kim", value=156000, stage="Negotiation", probability=75, owner="Lucas Mendes"),
                Deal(company="Nexus Technologies", contact="Ava Johnson", value=128000, stage="Proposal", probability=55, owner="Lucas Mendes"),
                Deal(company="Bluebird Health", contact="Liam Chen", value=64000, stage="Qualified", probability=35, owner="Marcus Thompson"),
                Deal(company="Northstar Retail", contact="Emma Davis", value=42000, stage="Prospecting", probability=15, owner="Lucas Mendes"),
            ]
        )
        db.add_all(
            [
                Project(name="Mobile App Launch", team_size=8, progress=89, status="on-track", due_date="Aug 18, 2026", tasks_done=42, tasks_total=47),
                Project(name="Website Redesign", team_size=5, progress=64, status="at-risk", due_date="Sep 02, 2026", tasks_done=28, tasks_total=44),
                Project(name="Data Migration", team_size=6, progress=41, status="delayed", due_date="Jul 30, 2026", tasks_done=17, tasks_total=41),
                Project(name="Q3 Brand Campaign", team_size=4, progress=72, status="on-track", due_date="Aug 25, 2026", tasks_done=23, tasks_total=32),
                Project(name="Security Audit", team_size=3, progress=28, status="on-track", due_date="Oct 10, 2026", tasks_done=9, tasks_total=32),
            ]
        )
        db.add_all(
            [
                InventoryItem(sku="HW-1048", name="MacBook Pro 14-inch", category="Hardware", stock=24, reorder_threshold=10, price=2199, supplier="Apple"),
                InventoryItem(sku="HW-2031", name="27-inch 4K Monitor", category="Hardware", stock=8, reorder_threshold=12, price=499, supplier="Dell"),
                InventoryItem(sku="OF-3100", name="Ergonomic Chair", category="Office", stock=31, reorder_threshold=8, price=649, supplier="Herman Miller"),
                InventoryItem(sku="SW-4402", name="Productivity Suite License", category="Software", stock=120, reorder_threshold=25, price=18, supplier="Atlassian"),
                InventoryItem(sku="OF-5120", name="Wireless Keyboard", category="Office", stock=42, reorder_threshold=15, price=129, supplier="Logitech"),
            ]
        )
        db.add_all(
            [
                Transaction(description="Invoice TXN-8822 · Nexus Technologies", category="Revenue", amount=128000, date="Jul 25, 2026", status="cleared"),
                Transaction(description="Payroll · July 2026", category="Payroll", amount=-184000, date="Jul 24, 2026", status="cleared"),
                Transaction(description="Cloud infrastructure · AWS", category="Infrastructure", amount=-22400, date="Jul 22, 2026", status="cleared"),
                Transaction(description="Orion Systems contract", category="Revenue", amount=87200, date="Jul 20, 2026", status="pending"),
                Transaction(description="Q3 campaign production", category="Marketing", amount=-14800, date="Jul 18, 2026", status="pending"),
            ]
        )
        db.add_all(
            [
                Workflow(name="Lead Qualification Router", trigger="New CRM lead created", run_count=1248, success_rate=98.4, is_active=True),
                Workflow(name="Invoice Approval", trigger="Finance invoice exceeds $10k", run_count=386, success_rate=96.8, is_active=True),
                Workflow(name="Onboarding Checklist", trigger="New employee added", run_count=64, success_rate=100, is_active=True),
                Workflow(name="Low Stock Alert", trigger="Inventory below threshold", run_count=21, success_rate=95.2, is_active=False),
                Workflow(name="Weekly Executive Digest", trigger="Every Monday at 8:00 AM", run_count=32, success_rate=100, is_active=True),
            ]
        )
        db.commit()


app = FastAPI(title="Nexus Enterprise OS API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    seed_database()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/auth/demo-accounts")
def demo_accounts(db: Session = Depends(db_session)) -> list[dict[str, str]]:
    return [{"email": user.email, "role": user.role} for user in db.query(User).order_by(User.id).all()]


@app.post("/api/auth/login")
def login(payload: LoginRequest, db: Session = Depends(db_session)) -> dict[str, Any]:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"access_token": create_token(user), "token_type": "bearer", "user": UserOut.model_validate(user).model_dump()}


@app.get("/api/auth/me", response_model=UserOut)
def auth_me(user: User = Depends(current_user)) -> User:
    return user


def resource_routes(
    path: str,
    model: Type[Any],
    read_roles: tuple[str, ...] = ("admin", "manager", "employee"),
    write_roles: tuple[str, ...] = ("admin", "manager"),
    delete_roles: tuple[str, ...] = ("admin",),
) -> None:
    @app.get(f"/api/{path}")
    def list_items(db: Session = Depends(db_session), user: User = Depends(require_roles(*read_roles))):
        return [serialize(row) for row in db.query(model).order_by(model.id.desc()).all()]

    @app.get(f"/api/{path}/{{item_id}}")
    def get_item(item_id: int, db: Session = Depends(db_session), user: User = Depends(require_roles(*read_roles))):
        row = db.get(model, item_id)
        if not row:
            raise HTTPException(status_code=404, detail="Record not found")
        return serialize(row)

    @app.post(f"/api/{path}")
    def create_item(payload: ResourcePayload, db: Session = Depends(db_session), user: User = Depends(require_roles(*write_roles))):
        allowed = {column.name for column in model.__table__.columns if column.name not in {"id", "created_at", "updated_at"}}
        values = {key: value for key, value in payload.model_dump().items() if key in allowed}
        row = model(**values)
        db.add(row)
        db.commit()
        db.refresh(row)
        return serialize(row)

    @app.put(f"/api/{path}/{{item_id}}")
    def update_item(item_id: int, payload: ResourcePayload, db: Session = Depends(db_session), user: User = Depends(require_roles(*write_roles))):
        row = db.get(model, item_id)
        if not row:
            raise HTTPException(status_code=404, detail="Record not found")
        allowed = {column.name for column in model.__table__.columns if column.name not in {"id", "created_at", "updated_at"}}
        for key, value in payload.model_dump().items():
            if key in allowed:
                setattr(row, key, value)
        db.commit()
        db.refresh(row)
        return serialize(row)

    @app.delete(f"/api/{path}/{{item_id}}")
    def delete_item(item_id: int, db: Session = Depends(db_session), user: User = Depends(require_roles(*delete_roles))):
        row = db.get(model, item_id)
        if not row:
            raise HTTPException(status_code=404, detail="Record not found")
        db.delete(row)
        db.commit()
        return {"deleted": item_id}


resource_routes("hrms/employees", Employee)
resource_routes("crm/deals", Deal)
resource_routes("erp/inventory", InventoryItem)
resource_routes("finance/transactions", Transaction, read_roles=("admin", "manager"), write_roles=("admin",), delete_roles=("admin",))
resource_routes("projects", Project)
resource_routes("workflow", Workflow, read_roles=("admin", "manager"), write_roles=("admin", "manager"), delete_roles=("admin",))


@app.put("/api/hrms/employees/me")
def update_own_employee(payload: ResourcePayload, db: Session = Depends(db_session), user: User = Depends(require_roles("employee"))):
    row = db.query(Employee).filter(Employee.name == user.name).first()
    if not row:
        raise HTTPException(status_code=404, detail="Your employee profile was not found")
    for key, value in payload.model_dump().items():
        if key in {"role", "department", "status", "location"}:
            setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return serialize(row)


@app.patch("/api/workflow/{item_id}/toggle")
def toggle_workflow(item_id: int, db: Session = Depends(db_session), user: User = Depends(require_roles("admin", "manager"))):
    row = db.get(Workflow, item_id)
    if not row:
        raise HTTPException(status_code=404, detail="Workflow not found")
    row.is_active = not row.is_active
    db.commit()
    db.refresh(row)
    return serialize(row)


@app.get("/api/overview")
def overview(db: Session = Depends(db_session), user: User = Depends(current_user)):
    deals = db.query(Deal).all()
    transactions = db.query(Transaction).all()
    revenue = sum(item.amount for item in transactions if item.amount > 0)
    expenses = abs(sum(item.amount for item in transactions if item.amount < 0))
    pipeline = {}
    for deal in deals:
        pipeline[deal.stage] = pipeline.get(deal.stage, 0) + deal.value
    activity = [
        {"module": "Projects", "text": "Mobile App Launch project hit 89% completion", "time": "18 min ago", "tone": "success"},
        {"module": "Finance", "text": "Invoice TXN-8822 from Nexus Technologies received", "time": "1h ago", "tone": "accent"},
        {"module": "HRMS", "text": "Lucas Mendes submitted PTO request", "time": "3h ago", "tone": "warning"},
        {"module": "CRM", "text": "Orion Systems deal marked Closed Won", "time": "5h ago", "tone": "success"},
        {"module": "Workflow", "text": "Lead Qualification Router processed 42 leads", "time": "Yesterday", "tone": "accent"},
    ]
    return {
        "stats": {
            "revenue": revenue,
            "active_employees": db.query(Employee).filter(Employee.status.in_(["active", "remote"])).count(),
            "open_deals": db.query(Deal).filter(Deal.stage != "Closed Won").count(),
            "projects": db.query(Project).count(),
            "expenses": expenses,
        },
        "revenue_series": [
            {"month": "Jan", "revenue": revenue * 0.50, "expenses": expenses * 0.54},
            {"month": "Feb", "revenue": revenue * 0.60, "expenses": expenses * 0.58},
            {"month": "Mar", "revenue": revenue * 0.68, "expenses": expenses * 0.62},
            {"month": "Apr", "revenue": revenue * 0.64, "expenses": expenses * 0.57},
            {"month": "May", "revenue": revenue * 0.78, "expenses": expenses * 0.72},
            {"month": "Jun", "revenue": revenue * 0.88, "expenses": expenses * 0.86},
            {"month": "Jul", "revenue": revenue, "expenses": expenses},
        ],
        "pipeline": [{"name": key, "value": value} for key, value in pipeline.items()],
        "activity": activity,
    }


@app.get("/api/analytics")
def analytics(db: Session = Depends(db_session), user: User = Depends(require_roles("admin", "manager", "employee"))):
    return {
        "employees_by_department": [
            {"name": department, "value": count}
            for department, count in db.query(Employee.department, func.count(Employee.id)).group_by(Employee.department).all()
        ],
        "project_status": [
            {"name": status_name, "value": count}
            for status_name, count in db.query(Project.status, func.count(Project.id)).group_by(Project.status).all()
        ],
        "inventory_value": sum(item.stock * item.price for item in db.query(InventoryItem).all()),
        "deal_value": sum(item.value for item in db.query(Deal).all()),
    }


@app.post("/api/copilot/ask")
def copilot(payload: CopilotRequest, db: Session = Depends(db_session), user: User = Depends(current_user)):
    employee_count = db.query(Employee).count()
    deal_count = db.query(Deal).filter(Deal.stage != "Closed Won").count()
    project = db.query(Project).order_by(Project.progress.desc()).first()
    return {
        "response": (
            f"I checked the live workspace data for “{payload.question}”. "
            f"There are {employee_count} employee profiles and {deal_count} open deals. "
            f"The strongest project is {project.name} at {project.progress}% completion. "
            "I can break down any module further if you’d like."
        )
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
