#!/usr/bin/env python3
"""ZLCE state checker wrapper.
Forwards execution to canonical scripts/zlce/zlce-check.py
"""
import os, subprocess, sys

here = os.path.dirname(os.path.abspath(__file__))
target = os.path.join(here, "zlce", "zlce-check.py")
sys.exit(subprocess.call([sys.executable, target] + sys.argv[1:]))
