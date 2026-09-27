import subprocess
import tempfile
import os
import sys
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Dict, Any

_executor = ThreadPoolExecutor(max_workers=4)

DEFAULT_CODE: Dict[str, str] = {
    "python": (
        '# Python 3 Workspace\n'
        'def solve():\n'
        '    numbers = [3, 1, 4, 1, 5, 9, 2, 6]\n'
        '    print("Original list:", numbers)\n'
        '    print("Sorted list:  ", sorted(numbers))\n'
        '    print("Sum:          ", sum(numbers))\n'
        '\n'
        'if __name__ == "__main__":\n'
        '    print("Hello from LearnOS Code Workspace!")\n'
        '    solve()\n'
    ),
    "javascript": (
        '// JavaScript (Node.js) Workspace\n'
        'console.log("Hello from LearnOS Code Workspace!");\n\n'
        'const items = ["Concepts", "Notes", "Flashcards", "Code", "Mind Map"];\n'
        'items.forEach((item, index) => {\n'
        '  console.log(`[${index + 1}] ${item} ready`);\n'
        '});\n'
    ),
    "cpp": (
        '// C++ Workspace\n'
        '#include <iostream>\n'
        '#include <vector>\n'
        '#include <numeric>\n'
        '\n'
        'int main() {\n'
        '    std::cout << "Hello from LearnOS C++ Workspace!" << std::endl;\n'
        '    std::vector<int> nums = {10, 20, 30, 40, 50};\n'
        '    int total = 0;\n'
        '    for (int n : nums) {\n'
        '        total += n;\n'
        '    }\n'
        '    std::cout << "Sum of elements: " << total << std::endl;\n'
        '    return 0;\n'
        '}\n'
    ),
}

def _run_cpp(code: str, timeout: int = 10) -> Dict[str, Any]:
    temp_dir = tempfile.gettempdir()
    unique_id = f"learnos_cpp_{os.getpid()}_{int(time.time() * 1000)}"
    src_file = os.path.join(temp_dir, f"{unique_id}.cpp")
    bin_file = os.path.join(temp_dir, f"{unique_id}.exe")

    with open(src_file, "w", encoding="utf-8") as f:
        f.write(code)

    start_time = time.perf_counter()
    try:
        # Step 1: Compile with g++ (no heavy optimizations for fast student turnaround)
        compile_res = subprocess.run(
            ["g++", "-O0", src_file, "-o", bin_file],
            capture_output=True,
            text=True,
            timeout=15,
            cwd=temp_dir,
        )
        if compile_res.returncode != 0:
            elapsed = int((time.perf_counter() - start_time) * 1000)
            return {
                "stdout": "",
                "stderr": f"Compilation Error:\n{compile_res.stderr}",
                "exit_code": compile_res.returncode,
                "timed_out": False,
                "execution_time_ms": elapsed,
            }

        # Step 2: Run executable
        exec_res = subprocess.run(
            [bin_file],
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=temp_dir,
        )
        elapsed = int((time.perf_counter() - start_time) * 1000)
        return {
            "stdout": exec_res.stdout,
            "stderr": exec_res.stderr,
            "exit_code": exec_res.returncode,
            "timed_out": False,
            "execution_time_ms": elapsed,
        }
    except subprocess.TimeoutExpired:
        elapsed = int((time.perf_counter() - start_time) * 1000)
        return {
            "stdout": "",
            "stderr": f"Execution timed out after {timeout} seconds.",
            "exit_code": 124,
            "timed_out": True,
            "execution_time_ms": elapsed,
        }
    except FileNotFoundError:
        return {
            "stdout": "",
            "stderr": "g++ compiler not found on system PATH. Please ensure MinGW/GCC is installed.",
            "exit_code": 127,
            "timed_out": False,
            "execution_time_ms": 0,
        }
    except Exception as e:
        return {
            "stdout": "",
            "stderr": f"Error running C++ code: {str(e)}",
            "exit_code": 1,
            "timed_out": False,
            "execution_time_ms": 0,
        }
    finally:
        for p in (src_file, bin_file):
            if os.path.exists(p):
                try:
                    os.unlink(p)
                except Exception:
                    pass

def _run_code_sync(language: str, code: str) -> Dict[str, Any]:
    lang = language.lower().strip()
    if lang in ("cpp", "c++"):
        return _run_cpp(code)

    config = {
        "python": {"cmd": [sys.executable], "ext": ".py", "timeout": 10},
        "javascript": {"cmd": ["node"], "ext": ".js", "timeout": 10},
    }.get(lang)

    if not config:
        return {
            "stdout": "",
            "stderr": f"Language '{language}' is not supported. Supported: C++, Python, JavaScript.",
            "exit_code": 1,
            "timed_out": False,
            "execution_time_ms": 0,
        }

    temp_dir = tempfile.gettempdir()
    unique_id = f"learnos_{lang}_{os.getpid()}_{int(time.time() * 1000)}"
    src_file = os.path.join(temp_dir, f"{unique_id}{config['ext']}")

    with open(src_file, "w", encoding="utf-8") as f:
        f.write(code)

    start_time = time.perf_counter()
    try:
        res = subprocess.run(
            config["cmd"] + [src_file],
            capture_output=True,
            text=True,
            timeout=config["timeout"],
            cwd=temp_dir,
        )
        elapsed = int((time.perf_counter() - start_time) * 1000)
        return {
            "stdout": res.stdout,
            "stderr": res.stderr,
            "exit_code": res.returncode,
            "timed_out": False,
            "execution_time_ms": elapsed,
        }
    except subprocess.TimeoutExpired:
        elapsed = int((time.perf_counter() - start_time) * 1000)
        return {
            "stdout": "",
            "stderr": f"Execution timed out after {config['timeout']} seconds.",
            "exit_code": 124,
            "timed_out": True,
            "execution_time_ms": elapsed,
        }
    except FileNotFoundError:
        runtime = config["cmd"][0]
        return {
            "stdout": "",
            "stderr": f"Runtime '{runtime}' not found on system PATH.",
            "exit_code": 127,
            "timed_out": False,
            "execution_time_ms": 0,
        }
    except Exception as e:
        return {
            "stdout": "",
            "stderr": str(e),
            "exit_code": 1,
            "timed_out": False,
            "execution_time_ms": 0,
        }
    finally:
        if os.path.exists(src_file):
            try:
                os.unlink(src_file)
            except Exception:
                pass

async def run_code(language: str, code: str) -> Dict[str, Any]:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _run_code_sync, language, code)
