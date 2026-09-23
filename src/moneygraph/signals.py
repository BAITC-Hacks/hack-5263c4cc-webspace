"""Compatibility imports for the deterministic bounded signal service."""
from .analysis.signals import (
    MAX_CYCLES, MAX_CYCLE_STEPS, MAX_ROUTES, MAX_ROUTE_PAIRS, SignalAnalysis,
)

__all__ = ["SignalAnalysis", "MAX_CYCLES", "MAX_CYCLE_STEPS", "MAX_ROUTES", "MAX_ROUTE_PAIRS"]
