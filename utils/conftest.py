import pytest

def pytest_addoption(parser):

    parser.addoption(
        "--generate-data",
        action="store_true",
        default=False,
        help="Enable auto-generation of Excel test data"
    )

@pytest.fixture(scope="session")
def generate_data_enabled(request):

    return request.config.getoption("--generate-data")
