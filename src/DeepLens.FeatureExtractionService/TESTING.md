# Testing Guide - Feature Extraction Service

Complete testing framework for the DeepLens Feature Extraction Service with comprehensive unit tests, integration tests, and API tests.

## Quick Start

### 1. Install Test Dependencies

```powershell
# Install development dependencies (includes pytest, coverage, etc.)
pip install -r requirements-dev.txt
```

### 2. Run All Tests

```powershell
# Simple test run
pytest

# With coverage report
pytest --cov=. --cov-report=html

# Using the test runner script
python run_tests.py --coverage
```

### 3. View Results

```powershell
# Open coverage report
start htmlcov/index.html   # Windows
open htmlcov/index.html    # Mac/Linux
```

## Test Categories

### Unit Tests (`@pytest.mark.unit`)
- **Purpose**: Test individual components in isolation
- **Speed**: Fast (< 1 second per test)
- **Dependencies**: Mocked external dependencies
- **Coverage**: Core business logic, configuration, data models

```powershell
# Run only unit tests
pytest -m unit
python run_tests.py --unit
```

### API Tests (`@pytest.mark.api`)
- **Purpose**: Test FastAPI endpoints and HTTP behavior
- **Speed**: Medium (1-5 seconds per test) 
- **Dependencies**: FastAPI TestClient with mocked services
- **Coverage**: Request/response handling, validation, error scenarios

```powershell
# Run only API tests  
pytest -m api
python run_tests.py --api
```

### Integration Tests (`@pytest.mark.integration`)
- **Purpose**: Test component interactions and end-to-end flows
- **Speed**: Medium to Slow (5+ seconds per test)
- **Dependencies**: Real components where safe, mocked external services
- **Coverage**: Complete feature extraction pipeline, threading, memory usage

```powershell
# Run only integration tests
pytest -m integration  
python run_tests.py --integration
```

### Slow Tests (`@pytest.mark.slow`)
- **Purpose**: Performance benchmarks and stress tests
- **Speed**: Slow (10+ seconds per test)
- **Usage**: Usually skipped in development, run in CI

```powershell
# Skip slow tests (default for fast development)
pytest -m "not slow"
python run_tests.py --fast

# Run only slow tests
pytest -m slow
```

## Test Structure

```
tests/
├── conftest.py                 # Shared fixtures and utilities
├── test_config.py             # Configuration loading tests
├── test_feature_extractor.py  # Core ML functionality tests  
├── test_api_endpoints.py      # FastAPI endpoint tests
└── test_integration.py        # End-to-end pipeline tests
```

## Test Fixtures

### Image Fixtures
```python
# Available in all tests via conftest.py
sample_image_bytes          # 224x224 JPEG test image
sample_png_image_bytes      # 100x100 PNG with transparency  
large_image_bytes           # 2000x2000 image for size limit testing
invalid_image_bytes         # Invalid data for error testing
```

### Mock Fixtures
```python
mock_extractor_success      # Mock successful feature extraction
mock_extractor_failure      # Mock model loading failure
mock_model_path            # Temporary ONNX file path
sample_feature_vector      # 2048-dimensional normalized vector
```

### API Fixtures  
```python
api_client                 # FastAPI TestClient
test_config               # Test configuration constants
```

## Running Specific Tests

### By File
```powershell
# Run specific test file
pytest tests/test_feature_extractor.py
python run_tests.py --file test_feature_extractor.py
```

### By Test Function
```powershell
# Run specific test
pytest -k "test_extract_features_success"
python run_tests.py --test "test_extract_features_success"
```

### By Class
```powershell
# Run all tests in a class
pytest tests/test_api_endpoints.py::TestHealthEndpoint
```

## Test Runner Script

The `run_tests.py` script provides convenient test execution:

```powershell
# Basic usage
python run_tests.py

# Common patterns
python run_tests.py --unit --fast              # Quick unit tests
python run_tests.py --coverage --verbose       # Full coverage report  
python run_tests.py --integration --parallel   # Integration tests in parallel
python run_tests.py --api --file test_api_endpoints.py  # Specific API tests
```

## Coverage Requirements

- **Target Coverage**: 80% minimum
- **Coverage Report**: Generated in `htmlcov/`
- **Exclusions**: Test files, external dependencies

### Coverage Commands
```powershell
# Generate coverage report
pytest --cov=. --cov-report=html --cov-report=term-missing

# Check coverage percentage
pytest --cov=. --cov-fail-under=80

# Coverage with specific test subset
pytest --cov=. -m unit --cov-report=term-missing
```

## Test Data Management

### Creating Test Images
```python
from tests.conftest import create_test_image

# Create custom test images
jpeg_image = create_test_image(640, 480, 'JPEG', color=(255, 0, 0))
png_image = create_test_image(100, 100, 'PNG', color=(0, 255, 0, 128))
```

### Asserting Feature Vectors
```python
from tests.conftest import assert_valid_feature_vector

# Validate extracted features
assert_valid_feature_vector(features, expected_dimension=2048)
```

### Asserting API Responses  
```python
from tests.conftest import assert_api_response_structure

# Validate API response format
assert_api_response_structure(response.json())
```

## Mocking Strategy

### Feature Extractor Mocking
```python
def test_with_mocked_extractor(mock_extractor_success):
    # Feature extractor automatically mocked to return success
    extractor = ResNet50FeatureExtractor("dummy_path")
    features, metadata = extractor.extract_features(image_bytes)
    # Test proceeds with predictable mock data
```

### ONNX Runtime Mocking
```python
@patch('onnxruntime.InferenceSession')
def test_with_mocked_onnx(mock_session_cls):
    # Complete control over ONNX behavior
    mock_session = Mock()
    mock_session.run.return_value = [mock_output]
    mock_session_cls.return_value = mock_session
```

## Performance Testing

### Response Time Assertions
```python
def test_performance(api_client, test_config):
    start_time = time.time()
    response = api_client.get("/health")
    end_time = time.time()
    
    response_time_ms = (end_time - start_time) * 1000
    assert response_time_ms < test_config.HEALTH_CHECK_MAX_TIME_MS
```

### Memory Usage Testing
```python
def test_memory_usage():
    initial_memory = psutil.Process().memory_info().rss
    # ... perform operations ...
    final_memory = psutil.Process().memory_info().rss
    assert (final_memory - initial_memory) < max_allowed_increase
```

## Parallel Testing

```powershell
# Install pytest-xdist for parallel execution
pip install pytest-xdist

# Run tests in parallel
pytest -n auto
python run_tests.py --parallel
```

## Continuous Integration

### GitHub Actions Example
```yaml
- name: Run tests with coverage
  run: |
    pip install -r requirements-dev.txt
    python run_tests.py --coverage --parallel
    
- name: Upload coverage reports
  uses: codecov/codecov-action@v3
  with:
    file: ./htmlcov/coverage.xml
```

## Test Environment Variables

Tests automatically use these environment variables:
```ini
LOG_LEVEL = DEBUG
MODEL_NAME = resnet50  
FEATURE_DIMENSION = 2048
```

Override in tests:
```python
@patch.dict(os.environ, {"LOG_LEVEL": "ERROR"})
def test_with_custom_env():
    # Test with custom environment
    pass
```

## Debugging Tests

### Run with PDB
```powershell
# Drop into debugger on failure
pytest --pdb

# Drop into debugger on first failure
pytest -x --pdb
```

### Verbose Output
```powershell
# Maximum verbosity
pytest -vvv

# Show print statements
pytest -s
```

### Test Discovery
```powershell
# List all available tests
pytest --collect-only

# List tests with markers
pytest --collect-only -m unit
```

## Common Issues & Solutions

### Issue: "ImportError: No module named 'main'"
**Solution**: Tests run from service root directory
```powershell
cd src/DeepLens.FeatureExtractionService
pytest  # ✅ Correct
```

### Issue: "ONNX model not found"
**Solution**: Use mock fixtures for unit tests
```python
def test_something(mock_extractor_success):  # ✅ Uses mock
    # Test doesn't need real ONNX model
```

### Issue: "Tests too slow"
**Solution**: Skip slow tests in development
```powershell
pytest -m "not slow"  # ✅ Fast development cycle
```

### Issue: "Coverage too low"  
**Solution**: Check which lines aren't covered
```powershell
pytest --cov=. --cov-report=term-missing
# Shows exact lines missing coverage
```

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Mock External Dependencies**: Don't rely on real ONNX models in unit tests
3. **Use Appropriate Markers**: Mark tests by type and speed
4. **Descriptive Test Names**: Test name should describe the scenario
5. **Assert Specific Behaviors**: Test both success and failure cases
6. **Performance Awareness**: Mark slow tests and provide fast alternatives

## Example Test Session

```powershell
# Complete test workflow
cd src/DeepLens.FeatureExtractionService

# 1. Quick smoke test (unit tests only)
python run_tests.py --unit --fast

# 2. Full test suite with coverage
python run_tests.py --coverage --verbose

# 3. Check specific component
python run_tests.py --file test_feature_extractor.py --verbose

# 4. Performance validation
python run_tests.py --integration --test "performance"

# 5. View coverage report
start htmlcov/index.html
```

This testing framework provides comprehensive coverage of the Feature Extraction Service while maintaining fast development cycles through appropriate mocking and test categorization.