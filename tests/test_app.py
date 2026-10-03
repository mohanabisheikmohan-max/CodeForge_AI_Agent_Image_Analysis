from app import sanitize_path
def test_sanitize_path():
    assert sanitize_path('../secret.txt') == 'secret.txt'
    assert sanitize_path('src\\main.py') == 'src/main.py'
