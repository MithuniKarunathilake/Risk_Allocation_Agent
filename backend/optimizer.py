from .models import Resource, Task, AllocationRequest
from typing import Dict, List


class ResourceOptimizer:
    def __init__(self, request: AllocationRequest):
        self.request = request

    def optimize(self) -> Dict:
        sorted_tasks = sorted(self.request.tasks, key=lambda x: x.priority, reverse=True)
        available = {r.name: r.quantity for r in self.request.available_resources}
        allocations = []

        for task in sorted_tasks:
            allocation = {"task": task.name, "resources": {}, "feasible": True}
            for req in task.required_materials:
                if req.name not in available or available[req.name] < req.quantity:
                    allocation["feasible"] = False
                    allocation[
                        "reason"] = f"Insufficient {req.name} (need {req.quantity}, have {available.get(req.name, 0)})"
                    break
                allocation["resources"][req.name] = req.quantity
                available[req.name] -= req.quantity

            allocations.append(allocation)

        return {"allocations": allocations, "remaining": available}