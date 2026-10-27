from typing import Annotated, Literal

from pydantic import BaseModel, EmailStr, Field, StringConstraints

# Leading/trailing spaces are stripped first, so "   " fails min_length instead of creating a blank user.
Username = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=50)]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class UserSignup(BaseModel):
    username: Username
    name: Name
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    confirm_password: str


class UserLogin(BaseModel):
    username: Annotated[str, StringConstraints(strip_whitespace=True)]
    password: str


class ChatTurn(BaseModel):
    """An earlier message in the conversation, sent so follow-up answers have context."""
    role: Literal["user", "model"]
    text: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]


class ChatRequest(BaseModel):
    message: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]
    history: list[ChatTurn] = Field(default_factory=list, max_length=10)
