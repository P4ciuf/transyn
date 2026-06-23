"""transyn-translate — M2M100 translation inference service.

Consumed as a sub-package by the Redis-backed worker, this package
exposes the M2M100 model wrapper (:mod:`translate.model`) and the
consuming worker loop (:mod:`translate.worker`) that listens for
translation jobs on a shared Redis list and writes results back.
"""

__version__ = "0.0.1"
