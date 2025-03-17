from .models import AllocationRequest
from .optimizer import ResourceOptimizer
from .reports import AllocationReport


class ResourceAllocationAgent:
    def process_request(self, request: AllocationRequest):
        try:
            optimizer = ResourceOptimizer(request)
            result = optimizer.optimize()
            recommendations = self.generate_recommendations(result)
            report = AllocationReport(request, result, recommendations).generate()
            return {"report": report}
        except Exception as e:
            return {"error": f"Processing failed: {str(e)}"}

    def generate_recommendations(self, result):
        recs = []
        unallocated = [alloc for alloc in result["allocations"] if not alloc["feasible"]]

        if unallocated:
            recs.append("Insufficient resources for tasks: " +
                        ", ".join([f"{alloc['task']} ({alloc.get('reason', 'unknown')})" for alloc in unallocated]))

        remaining = {k: v for k, v in result["remaining"].items() if v > 0}
        if remaining:
            recs.append("Excess resources: " + ", ".join([f"{k}: {v}" for k, v in remaining.items()]))

        return recs if recs else ["All resources allocated optimally"]