from sqlalchemy import Column, Integer, String, JSON, Boolean
from database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, unique=True, index=True)

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String)
    answers = Column(JSON)
    is_flagged = Column(Boolean, default=False)

class ExamEvent(Base):
    __tablename__ = "exam_events"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, index=True)
    event_type = Column(String)
    timestamp = Column(String)
    confidence = Column(JSON) # Using JSON/Float for flexibility
