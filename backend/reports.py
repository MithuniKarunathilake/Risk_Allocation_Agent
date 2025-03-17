from .models import AllocationRequest
from typing import Dict, List

class AllocationReport:
    def __init__(self, request: AllocationRequest, result: Dict, recommendations: List[str]):
        self.request = request
        self.result = result
        self.recommendations = recommendations

    def generate(self) -> Dict:
        total_cost = self.calculate_total_cost()
        resource_usage = self.calculate_resource_usage()

        return {
            "summary": {
                "total_tasks": len(self.request.tasks),
                "allocated_tasks": len([a for a in self.result["allocations"] if a["feasible"]]),
                "total_cost": round(total_cost, 2)
            },
            "allocations": [
                {**alloc, "labor": next(t.required_labor for t in self.request.tasks if t.name == alloc["task"])}
                for alloc in self.result["allocations"]
            ],
            "remaining_resources": self.result["remaining"],
            "resource_usage": resource_usage,
            "recommendations": self.recommendations
        }

    def calculate_total_cost(self) -> float:
        total = 0
        for alloc in self.result["allocations"]:
            if alloc["feasible"]:
                for res_name, qty in alloc["resources"].items():
                    for avail_res in self.request.available_resources:
                        if avail_res.name == res_name:
                            total += qty * avail_res.unit_cost
        return total

    def calculate_resource_usage(self) -> Dict:
        usage = {}
        for res in self.request.available_resources:
            initial = res.quantity
            remaining = self.result["remaining"].get(res.name, 0)
            used = initial - remaining
            usage[res.name] = {
                "initial": initial,
                "used": used,
                "remaining": remaining,
                "percent_used": round((used / initial * 100), 2) if initial > 0 else 0
            }
        return usage