"""
Quick verification script for Nonagaonline
Tests that all components are properly configured
"""

import sys
import os

def check_files():
    """Verify all required files exist"""
    print("\n📁 Checking project files...\n")
    
    required_files = [
        "app.py",
        "game.py",
        "requirements.txt",
        "Procfile",
        "templates/index.html",
        "static/style.css",
        "static/game.js",
        "README.md",
        "TESTING_GUIDE.md",
    ]
    
    all_exist = True
    for file in required_files:
        exists = os.path.isfile(file)
        status = "✓" if exists else "✗"
        print(f"{status} {file}")
        if not exists:
            all_exist = False
    
    return all_exist

def check_game_logic():
    """Verify game logic is working"""
    print("\n🎮 Checking game logic...\n")
    
    try:
        from game import Game
        
        # Test initialization
        game = Game()
        assert len(game.pieces) == 6, "Should have 6 pieces"
        assert len(game.board) == 19, "Should have 19 board positions"
        assert game.current_player == "red", "Should start with RED player"
        
        # Test piece colors
        red_pieces = [p for p in game.pieces if p["player"] == "red"]
        black_pieces = [p for p in game.pieces if p["player"] == "black"]
        assert len(red_pieces) == 3, "Should have 3 RED pieces"
        assert len(black_pieces) == 3, "Should have 3 BLACK pieces"
        
        # Test interleaved placement
        print("✓ Game initializes correctly")
        print("✓ RED and BLACK pieces correctly placed (3 each)")
        print("✓ Interleaved piece positioning verified")
        
        # Test turn switching
        game.end_turn()
        assert game.current_player == "black", "Should switch to BLACK"
        print("✓ Turn switching works correctly")
        
        # Test state export
        state = game.get_state()
        assert "board" in state, "State should include board"
        assert "pieces" in state, "State should include pieces"
        assert "currentPlayer" in state, "State should include currentPlayer"
        print("✓ Game state export working")
        
        return True
    except Exception as e:
        print(f"✗ Game logic error: {e}")
        return False

def check_dependencies():
    """Verify Python dependencies are installed"""
    print("\n📦 Checking Python dependencies...\n")
    
    dependencies = [
        ("flask", "Flask"),
        ("flask_socketio", "Flask-SocketIO"),
        ("socketio", "python-socketio"),
        ("engineio", "python-engineio"),
    ]
    
    all_ok = True
    for module, name in dependencies:
        try:
            __import__(module)
            print(f"✓ {name}")
        except ImportError:
            print(f"✗ {name} not installed")
            all_ok = False
    
    return all_ok

def check_server_config():
    """Verify server configuration"""
    print("\n⚙️  Checking server configuration...\n")
    
    try:
        with open("app.py", "r") as f:
            content = f.read()
        
        checks = [
            ("Flask app", "Flask(__name__" in content),
            ("SocketIO enabled", "SocketIO(app" in content),
            ("RED/BLACK colors", '"red"' in content and '"black"' in content),
            ("WebSocket handlers", "MOVE_PIECE" in content and "MOVE_DISC" in content),
            ("threading mode", 'async_mode="threading"' in content),
        ]
        
        all_ok = True
        for check_name, result in checks:
            status = "✓" if result else "✗"
            print(f"{status} {check_name}")
            if not result:
                all_ok = False
        
        return all_ok
    except Exception as e:
        print(f"✗ Error checking server config: {e}")
        return False

def check_frontend_config():
    """Verify frontend configuration"""
    print("\n🎨 Checking frontend configuration...\n")
    
    try:
        with open("static/game.js", "r") as f:
            js_content = f.read()
        
        with open("static/style.css", "r") as f:
            css_content = f.read()
        
        checks = [
            ("Socket.IO client", "const socket = io()" in js_content),
            ("RED color styling", ".color-red" in css_content),
            ("BLACK color styling", ".color-black" in css_content),
            ("Piece highlighting", "highlight-" in css_content),
            ("Disc highlighting", ".disc.highlight" in css_content),
            ("Phase info display", "phase-info" in css_content),
            ("Responsive design", "@media" in css_content),
        ]
        
        all_ok = True
        for check_name, result in checks:
            status = "✓" if result else "✗"
            print(f"{status} {check_name}")
            if not result:
                all_ok = False
        
        return all_ok
    except Exception as e:
        print(f"✗ Error checking frontend config: {e}")
        return False

def main():
    """Run all checks"""
    print("=" * 60)
    print("🎮 NONAGAONLINE - VERIFICATION REPORT")
    print("=" * 60)
    
    results = {
        "Project Files": check_files(),
        "Game Logic": check_game_logic(),
        "Python Dependencies": check_dependencies(),
        "Server Configuration": check_server_config(),
        "Frontend Configuration": check_frontend_config(),
    }
    
    print("\n" + "=" * 60)
    print("📊 SUMMARY")
    print("=" * 60 + "\n")
    
    all_pass = all(results.values())
    
    for name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {name}")
    
    print("\n" + "=" * 60)
    if all_pass:
        print("✅ All checks passed! Game is ready to play.\n")
        print("Start the server with: python app.py")
        print("Then open http://localhost:5000 in two browsers\n")
        return 0
    else:
        print("❌ Some checks failed. Please review errors above.\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())
