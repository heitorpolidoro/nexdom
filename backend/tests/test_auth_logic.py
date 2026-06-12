import uuid

import jwt

from app.core import security
from app.core.config import settings


def test_password_hashing():
    password = "secret_password"
    hashed = security.get_password_hash(password)
    assert hashed != password
    assert security.verify_password(password, hashed) is True
    assert security.verify_password("wrong_password", hashed) is False


def test_create_access_token():
    user_id = uuid.uuid4()
    token = security.create_access_token(user_id)
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == str(user_id)
    assert "exp" in payload
