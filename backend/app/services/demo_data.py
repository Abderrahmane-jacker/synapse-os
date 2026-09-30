"""
Synthetic Demo Knowledge Data Provider for SynapseOS Demo Mode.
Serves 100% generic, non-personal cybersecurity, AI, and software engineering demonstration notes.
"""

from datetime import datetime

DEMO_NOTES = [
    {
        "title": "01 - Introduction to SynapseOS",
        "path": "01 - Introduction to SynapseOS.md",
        "category": "Architecture",
        "folder": "01 - Architecture",
        "tags": ["architecture", "synapse", "rag", "second-brain"],
        "content": "# Introduction to SynapseOS\n\nWelcome to SynapseOS, the next-generation AI operational system for cybersecurity operators and power developers.\n\n## Features:\n- 3D Knowledge Graph RAG Search\n- Interactive Tactical Command Vectors\n- Persistent Terminal Session\n- Hands-Free Voice Briefing Engine",
        "links": ["02 - Cloud Reconnaissance & Asset Discovery", "05 - Autonomous Claude Agent Playbooks"],
        "created": datetime(2026, 7, 30, 16, 0, 0),
        "modified": datetime(2026, 7, 30, 16, 0, 0)
    },
    {
        "title": "02 - Cloud Reconnaissance & Asset Discovery",
        "path": "02 - Cloud Reconnaissance & Asset Discovery.md",
        "category": "Reconnaissance",
        "folder": "02 - Reconnaissance",
        "tags": ["recon", "cloud", "nmap", "asset-discovery"],
        "content": "# Cloud Reconnaissance & Asset Discovery\n\nMethodology for identifying cloud attack surfaces, exposed storage buckets, and open ports.\n\n```bash\nnmap -sS -p- --min-rate 5000 -T4 -Pn <TARGET_IP>\n```",
        "links": ["01 - Introduction to SynapseOS", "04 - Web Application Vulnerability Fuzzing"],
        "created": datetime(2026, 7, 30, 15, 30, 0),
        "modified": datetime(2026, 7, 30, 15, 30, 0)
    },
    {
        "title": "03 - Active Directory Attack Methodology",
        "path": "03 - Active Directory Attack Methodology.md",
        "category": "Penetration Testing",
        "folder": "03 - Penetration Testing",
        "tags": ["active-directory", "kerberoasting", "bloodhound", "privesc"],
        "content": "# Active Directory Attack Methodology\n\nStep-by-step guide for Kerberoasting, AS-REP Roasting, and Domain Controller privilege escalation.\n\n```bash\nGetNPUsers.py domain.local/ -usersfile users.txt -format john -outputfile hashes.asreproast\n```",
        "links": ["02 - Cloud Reconnaissance & Asset Discovery", "06 - Docker Container Isolation & Security"],
        "created": datetime(2026, 7, 30, 15, 0, 0),
        "modified": datetime(2026, 7, 30, 15, 0, 0)
    },
    {
        "title": "04 - Web Application Vulnerability Fuzzing",
        "path": "04 - Web Application Vulnerability Fuzzing.md",
        "category": "Web Security",
        "folder": "04 - Web Security",
        "tags": ["gobuster", "ffuf", "sql-injection", "fuzzing"],
        "content": "# Web Application Vulnerability Fuzzing\n\nHigh-performance directory and endpoint fuzzing strategies using Gobuster and FFUF.\n\n```bash\ngobuster dir -u http://<TARGET_IP> -w /usr/share/wordlists/dirb/common.txt\n```",
        "links": ["01 - Introduction to SynapseOS", "05 - Autonomous Claude Agent Playbooks"],
        "created": datetime(2026, 7, 30, 14, 30, 0),
        "modified": datetime(2026, 7, 30, 14, 30, 0)
    },
    {
        "title": "05 - Autonomous Claude Agent Playbooks",
        "path": "05 - Autonomous Claude Agent Playbooks.md",
        "category": "AI Automation",
        "folder": "05 - AI Automation",
        "tags": ["claude-code", "agent", "pty", "automation"],
        "content": "# Autonomous Claude Agent Playbooks\n\nConfiguring persistent PTY agent loops for continuous automated vulnerability scanning and code refactoring.",
        "links": ["01 - Introduction to SynapseOS", "06 - Docker Container Isolation & Security"],
        "created": datetime(2026, 7, 30, 14, 0, 0),
        "modified": datetime(2026, 7, 30, 14, 0, 0)
    },
    {
        "title": "06 - Docker Container Isolation & Security",
        "path": "06 - Docker Container Isolation & Security.md",
        "category": "DevSecOps",
        "folder": "06 - DevSecOps",
        "tags": ["docker", "container", "sandbox", "security"],
        "content": "# Docker Container Isolation & Security\n\nHardening containerized agent runtimes with read-only filesystems, dropped capabilities, and ephemeral execution.",
        "links": ["03 - Active Directory Attack Methodology", "05 - Autonomous Claude Agent Playbooks"],
        "created": datetime(2026, 7, 30, 13, 30, 0),
        "modified": datetime(2026, 7, 30, 13, 30, 0)
    }
]

DEMO_COMMANDS = [
    {
        "id": "demo-cmd-1",
        "title": "Full TCP Port Syn Stealth Scan",
        "category": "Reconnaissance & Scanning",
        "description": "High-speed SYN scan across all 65,535 ports with service version detection.",
        "template": "nmap -sS -p- --min-rate 5000 -T4 -Pn <TARGET_IP>",
        "language": "bash",
        "parameters": [{"name": "<TARGET_IP>", "placeholder": "10.10.10.1", "default": "10.10.10.1"}],
        "tags": ["#nmap", "#recon", "#stealth"],
        "filepath": "demo/nmap_scan.md",
        "filename": "nmap_scan.md"
    },
    {
        "id": "demo-cmd-2",
        "title": "Web Directory Fuzzing via FFUF",
        "category": "Web Application Security",
        "description": "Ultra fast directory discovery filtering out standard 404 responses.",
        "template": "ffuf -u http://<TARGET_IP>/FUZZ -w /usr/share/wordlists/dirb/common.txt -mc 200,301,302",
        "language": "bash",
        "parameters": [{"name": "<TARGET_IP>", "placeholder": "10.10.10.1", "default": "10.10.10.1"}],
        "tags": ["#ffuf", "#fuzzing", "#web"],
        "filepath": "demo/ffuf_discovery.md",
        "filename": "ffuf_discovery.md"
    },
    {
        "id": "demo-cmd-3",
        "title": "Active Directory AS-REP Roasting",
        "category": "Active Directory Exploitation",
        "description": "Request AS-REP tokens for users without Kerberos pre-authentication required.",
        "template": "GetNPUsers.py <DOMAIN>/ -usersfile <USER_LIST> -format john -outputfile hashes.asreproast",
        "language": "bash",
        "parameters": [
            {"name": "<DOMAIN>", "placeholder": "corp.local", "default": "corp.local"},
            {"name": "<USER_LIST>", "placeholder": "users.txt", "default": "users.txt"}
        ],
        "tags": ["#impacket", "#kerberos", "#privesc"],
        "filepath": "demo/asrep_roast.md",
        "filename": "asrep_roast.md"
    },
    {
        "id": "demo-cmd-4",
        "title": "Linux TTY Interactive Shell Upgrade",
        "category": "Post-Exploitation & Shells",
        "description": "Spawn full PTY with job control, arrow keys, and auto-complete.",
        "template": "python3 -c 'import pty; pty.spawn(\"/bin/bash\")'",
        "language": "bash",
        "parameters": [],
        "tags": ["#pty", "#shell", "#post-exploit"],
        "filepath": "demo/tty_upgrade.md",
        "filename": "tty_upgrade.md"
    },
    {
        "id": "demo-cmd-5",
        "title": "Docker Ephemeral Container Sandbox",
        "category": "DevSecOps & Sandboxes",
        "description": "Launch isolated sandbox container with memory limit and read-only root.",
        "template": "docker run --rm -it --network none --memory 512m alpine:latest sh",
        "language": "bash",
        "parameters": [],
        "tags": ["#docker", "#sandbox", "#security"],
        "filepath": "demo/docker_sandbox.md",
        "filename": "docker_sandbox.md"
    },
    {
        "id": "demo-cmd-6",
        "title": "Subdomain Enumeration via Subfinder",
        "category": "Reconnaissance & Scanning",
        "description": "Passive online reconnaissance gathering subdomains from public intelligence sources.",
        "template": "subfinder -d <DOMAIN> -silent -o subdomains.txt",
        "language": "bash",
        "parameters": [{"name": "<DOMAIN>", "placeholder": "example.com", "default": "example.com"}],
        "tags": ["#subfinder", "#recon", "#osint"],
        "filepath": "demo/subfinder.md",
        "filename": "subfinder.md"
    }
]

def get_demo_notes() -> list:
    return DEMO_NOTES

def get_demo_commands() -> list:
    return DEMO_COMMANDS

def get_demo_dashboard(active_model: str = "gemma4:31b-cloud", ollama_online: bool = True) -> dict:
    categories = {}
    for n in DEMO_NOTES:
        c = n.get("category", "General")
        categories[c] = categories.get(c, 0) + 1

    command_categories = {}
    for cmd in DEMO_COMMANDS:
        cc = cmd.get("category", "General")
        command_categories[cc] = command_categories.get(cc, 0) + 1

    all_tags = []
    for n in DEMO_NOTES:
        all_tags.extend(n.get("tags", []))
    from collections import Counter
    top_tags = [{"tag": t, "count": cnt} for t, cnt in Counter(all_tags).most_common(12)]

    return {
        "stats": {
            "total_notes": len(DEMO_NOTES),
            "total_chunks": 24,
            "total_commands": len(DEMO_COMMANDS),
            "total_categories": len(categories),
            "ollama_online": ollama_online,
            "active_model": active_model,
            "vault_path": "SynapseOS Virtual Demo Matrix"
        },
        "categories": categories,
        "command_categories": command_categories,
        "recent_notes": [
            {
                "title": n.get("title"),
                "category": n.get("category", "General"),
                "folder": n.get("folder", ""),
                "tags": n.get("tags", [])[:4],
                "modified": n.get("modified").isoformat() if n.get("modified") else None,
                "path": n.get("path")
            }
            for n in DEMO_NOTES
        ],
        "top_tags": top_tags,
        "featured_commands": DEMO_COMMANDS
    }
