from typing import Optional

from pydantic import BaseModel, EmailStr, Field, model_validator

from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(min_length=8, description="At least 8 characters")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserPublic(UserBase):
    id: str
    is_active: bool = True
    created_at: datetime
    updated_at: datetime
    email_verified: Optional[bool] = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

    @model_validator(mode="after")
    def validate_non_empty(self):
        if self.name is None and self.email is None:
            raise ValueError("At least one field must be provided")
        return self

class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=8)
    new_password: str = Field(min_length=8)
