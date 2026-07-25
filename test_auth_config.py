import os
import unittest
from unittest.mock import patch

from auth_config import load_secret_key


class AuthConfigTests(unittest.TestCase):
    def test_missing_secret_fails(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "SESSION_SECRET"):
                load_secret_key()

    def test_weak_secret_fails(self):
        with patch.dict(os.environ, {"SESSION_SECRET": "too-short"}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "32 characters"):
                load_secret_key()

    def test_valid_secret_is_loaded_without_logging(self):
        secret = "s" * 32
        with patch.dict(os.environ, {"SESSION_SECRET": secret}, clear=True):
            self.assertEqual(load_secret_key(), secret)


if __name__ == "__main__":
    unittest.main()