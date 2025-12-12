#!/usr/bin/env python
"""
Test runner script for the Feature Extraction Service.
Provides convenient commands for running different types of tests.
"""
import sys
import subprocess
import argparse
from pathlib import Path


def run_command(cmd, description):
    """Run a command and handle errors."""
    print(f"\n🔧 {description}")
    print(f"Command: {' '.join(cmd)}")
    print("-" * 50)
    
    try:
        result = subprocess.run(cmd, check=True, cwd=Path(__file__).parent)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed with exit code {e.returncode}")
        return False
    except FileNotFoundError:
        print(f"❌ Command not found. Make sure pytest is installed: pip install -r requirements-dev.txt")
        return False


def main():
    parser = argparse.ArgumentParser(description="Test runner for Feature Extraction Service")
    parser.add_argument("--unit", action="store_true", help="Run unit tests only")
    parser.add_argument("--integration", action="store_true", help="Run integration tests only")
    parser.add_argument("--api", action="store_true", help="Run API tests only")
    parser.add_argument("--coverage", action="store_true", help="Run tests with coverage report")
    parser.add_argument("--fast", action="store_true", help="Skip slow tests")
    parser.add_argument("--parallel", action="store_true", help="Run tests in parallel")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--file", "-f", type=str, help="Run specific test file")
    parser.add_argument("--test", "-t", type=str, help="Run specific test function")
    
    args = parser.parse_args()

    # Base command
    cmd = ["python", "-m", "pytest"]
    
    # Add verbosity
    if args.verbose:
        cmd.append("-v")
    else:
        cmd.append("-q")
    
    # Add parallel execution
    if args.parallel:
        cmd.extend(["-n", "auto"])
    
    # Add coverage
    if args.coverage:
        cmd.extend([
            "--cov=.",
            "--cov-report=term-missing",
            "--cov-report=html:htmlcov",
            "--cov-fail-under=80"
        ])
    
    # Add test selection
    if args.unit:
        cmd.extend(["-m", "unit"])
    elif args.integration:
        cmd.extend(["-m", "integration"])
    elif args.api:
        cmd.extend(["-m", "api"])
    
    # Skip slow tests
    if args.fast:
        cmd.extend(["-m", "not slow"])
    
    # Specific file or test
    if args.file:
        cmd.append(f"tests/{args.file}")
    elif args.test:
        cmd.extend(["-k", args.test])
    
    # Run the tests
    success = run_command(cmd, "Running tests")
    
    if success and args.coverage:
        print(f"\n📊 Coverage report generated in htmlcov/index.html")
        print(f"💡 Open it with: open htmlcov/index.html (Mac) or start htmlcov/index.html (Windows)")
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())