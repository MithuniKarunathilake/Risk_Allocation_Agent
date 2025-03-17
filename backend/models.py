from pydantic import BaseModel, Field, ValidationError
from typing import List

class Resource(BaseModel):
    name: str = Field(..., min_length=1, description="Resource name")
    quantity: float = Field(..., ge=0, description="Available quantity")
    unit_cost: float = Field(..., ge=0, description="Cost per unit")

class Task(BaseModel):
    name: str = Field(..., min_length=1, description="Task name")
    required_materials: List[Resource] = Field(..., min_items=1, description="Required materials")
    required_labor: float = Field(..., ge=0, description="Labor hours needed")
    priority: int = Field(..., ge=1, le=10, description="Priority 1-10")

class AllocationRequest(BaseModel):
    tasks: List[Task] = Field(..., min_items=1, description="List of tasks")
    available_resources: List[Resource] = Field(..., min_items=1, description="Available resources")