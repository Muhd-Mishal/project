import os

class Config:
    SECRET_KEY = 'thisshouldbesecret'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///canteen.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
