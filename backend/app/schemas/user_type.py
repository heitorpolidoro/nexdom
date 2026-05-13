"""UserType schemas."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict


class UserTypeCreate(BaseModel):
    name: str


class UserTypeRead(BaseModel):
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class UserTypeUpdate(BaseModel):
    name: str
