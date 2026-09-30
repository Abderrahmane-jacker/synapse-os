import os
import re
try:
    import frontmatter
except ImportError:
    frontmatter = None
from datetime import datetime

class CommandParser:
    def scan_commands_repository(self, vault_path: str) -> list:
        """
        Scans the Commands Repository directory inside the Obsidian vault.
        Extracts code snippets, commands, parameters, and metadata.
        """
        commands = []
        if not vault_path or not os.path.exists(vault_path):
            return commands

        # Target the Commands Repository directory (handles emojis like 💻 Commands Repository)
        target_dir = None
        for root, dirs, _ in os.walk(vault_path):
            for d in dirs:
                if 'commands repository' in d.lower() or 'command repository' in d.lower():
                    target_dir = os.path.join(root, d)
                    break
            if target_dir:
                break

        if not target_dir:
            # Fallback to direct path check
            for item in os.listdir(vault_path) if os.path.exists(vault_path) else []:
                if 'commands repository' in item.lower():
                    target_dir = os.path.join(vault_path, item)
                    break

        if not target_dir or not os.path.exists(target_dir):
            return commands

        cmd_id_counter = 1

        for root, dirs, files in os.walk(target_dir):
            # Skip hidden folders
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            rel_folder = os.path.relpath(root, target_dir)
            category = rel_folder if rel_folder != '.' else "General Commands"

            for file in files:
                if file.endswith('.md'):
                    filepath = os.path.join(root, file)
                    try:
                        extracted = self.parse_command_file(filepath, category, cmd_id_counter)
                        for item in extracted:
                            commands.append(item)
                            cmd_id_counter += 1
                    except Exception as e:
                        print(f"Error parsing command file {filepath}: {e}")

        return commands

    def parse_command_file(self, filepath: str, default_category: str, start_id: int) -> list:
        items = []
        content = ""
        metadata = {}
        if frontmatter:
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    post = frontmatter.load(f)
                    content = post.content
                    metadata = post.metadata
            except Exception:
                pass

        if not content:
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
            except Exception:
                content = ""

        raw_title = os.path.basename(filepath).replace('.md', '')
        # Clean title by stripping leading numbering or emojis (e.g. "01 - ", "📋 ")
        clean_title = re.sub(r'^[0-9\s\-📋💻]+', '', raw_title).strip() or raw_title

        default_cat = clean_title.replace(' Commands', '').strip() or "General Commands"
        category = metadata.get('category') or (default_category if default_category != "General Commands" else default_cat)
        tags = metadata.get('tags') if isinstance(metadata.get('tags'), list) else []
        
        # Extract inline tags from content (#tag)
        inline_tags = re.findall(r'#([\w\-]+)', content)
        all_tags = list(set(tags + inline_tags))

        file_title = clean_title

        # Find code blocks with positions (```bash ... ``` or ```sh ... ```)
        block_matches = list(re.finditer(r'```([a-zA-Z0-9_\-]*)\n([\s\S]*?)```', content))

        if not block_matches:
            # If no code blocks, look for single backticks or single-line commands
            single_line_cmds = re.findall(r'`([^`\n]{4,})`', content)
            if single_line_cmds:
                for idx, code in enumerate(single_line_cmds):
                    code_clean = code.strip()
                    params = self.extract_parameters(code_clean)
                    items.append({
                        "id": f"cmd_{start_id + len(items)}",
                        "title": f"{file_title} ({idx + 1})",
                        "category": category,
                        "description": metadata.get('description', f"Command from {file_title}"),
                        "template": code_clean,
                        "language": "bash",
                        "parameters": params,
                        "tags": all_tags,
                        "filepath": filepath,
                        "filename": file_title
                    })
        else:
            for idx, match in enumerate(block_matches):
                lang = match.group(1).strip()
                code_clean = match.group(2).strip()
                if not code_clean:
                    continue

                # Find nearest header before this code block
                preceding_text = content[:match.start()]
                headers_before = re.findall(r'^(#+\s+.*)', preceding_text, re.MULTILINE)
                
                block_title = file_title
                if headers_before:
                    last_header = headers_before[-1].lstrip('#').strip()
                    clean_h = re.sub(r'^[0-9\.\s\-📋💻]+', '', last_header).strip()
                    if clean_h:
                        block_title = clean_h
                elif len(block_matches) > 1:
                    block_title = f"{file_title} - #{idx + 1}"

                params = self.extract_parameters(code_clean)
                items.append({
                    "id": f"cmd_{start_id + len(items)}",
                    "title": block_title,
                    "category": category,
                    "description": metadata.get('description', f"Command vector from {file_title}"),
                    "template": code_clean,
                    "language": lang.lower() if lang else "bash",
                    "parameters": params,
                    "tags": all_tags,
                    "filepath": filepath,
                    "filename": file_title
                })

        return items

    def extract_parameters(self, template: str) -> list:
        """
        Extracts variable placeholders like <TARGET_IP>, <PORT>, {{URL}}, $VAR from command template.
        """
        params = []
        # Match <VARIABLE_NAME>
        angle_params = re.findall(r'<([A-Za-z0-9_]+)>', template)
        # Match {{VARIABLE_NAME}}
        curly_params = re.findall(r'\{\{([A-Za-z0-9_]+)\}\}', template)
        
        seen = set()
        for p in angle_params + curly_params:
            if p not in seen and not p.isdigit():
                seen.add(p)
                params.append({
                    "name": p,
                    "placeholder": f"<{p}>",
                    "default": ""
                })

        return params

command_parser = CommandParser()
