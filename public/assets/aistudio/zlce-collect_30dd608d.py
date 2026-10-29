#!/usr/bin/env python3
"""ZLCE diagnostic collector wrapper.
Forwards execution to canonical scripts/zlce/zlce-collect.py
"""
import os, subprocess, sys

here = os.path.dirname(os.path.abspath(__file__))
target = os.path.join(here, "zlce", "zlce-collect.py")
sys.exit(subprocess.call([sys.executable, target] + sys.argv[1:]))
