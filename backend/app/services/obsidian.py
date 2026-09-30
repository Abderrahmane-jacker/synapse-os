import os
import frontmatter
import re
from datetime import datetime
from collections import deque, Counter
from app.services.clustering import kmeans_cluster

class ObsidianParser:
    def scan_vault(self, path: str) -> list:
        notes = []
        if not os.path.exists(path):
            return notes
        excluded = {'.obsidian', '.git', '.trash', 'node_modules', 'venv', '.next', 'commands repository', 'command repository', 'commands_repository'}
        for root, dirs, files in os.walk(path):
            dirs[:] = [d for d in dirs if d.lower() not in excluded and 'commands repository' not in d.lower()]
            if 'commands repository' in root.lower():
                continue
            for file in files:
                if file.endswith('.md'):
                    filepath = os.path.join(root, file)
                    try:
                        n = self.parse_note(filepath, vault_root=path)
                        if n:
                            notes.append(n)
                    except Exception:
                        pass
        # Sort notes by modified time descending (newest first)
        notes.sort(key=lambda x: x.get("modified") or datetime.min, reverse=True)
        return notes

    def parse_note(self, filepath: str, vault_root: str = "") -> dict:
        content = ""
        metadata = {}
        try:
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                post = frontmatter.load(f)
                content = post.content
                metadata = post.metadata
        except Exception:
            # Fallback if frontmatter YAML fails to parse (e.g. unquoted colons in HTB titles/metadata)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
            except Exception:
                content = ""
            metadata = {}
            
        title = os.path.basename(filepath).replace('.md', '')
        
        # Extract wikilinks
        links = re.findall(r'\[\[(.*?)\]\]', content)
        # Extract tags
        tags = re.findall(r'#([\w\-]+)', content)
        
        modified_time = datetime.fromtimestamp(os.path.getmtime(filepath))
        
        # Determine created time
        created_time = None
        if "created" in metadata:
            created_val = metadata["created"]
            if isinstance(created_val, datetime):
                created_time = created_val
            elif isinstance(created_val, str):
                try:
                    from dateutil.parser import parse as parse_date
                    created_time = parse_date(created_val)
                except:
                    pass
        elif "date" in metadata:
            date_val = metadata["date"]
            if isinstance(date_val, datetime):
                created_time = date_val
            elif isinstance(date_val, str):
                try:
                    from dateutil.parser import parse as parse_date
                    created_time = parse_date(date_val)
                except:
                    pass

        if not created_time:
            try:
                created_time = datetime.fromtimestamp(os.path.getctime(filepath))
            except:
                created_time = modified_time

        tag_list = list(set(tags + (metadata.get('tags', []) if isinstance(metadata.get('tags'), list) else [])))

        # Determine category and folder from relative path
        folder = ""
        category = "General"
        if vault_root and os.path.exists(vault_root):
            try:
                rel_dir = os.path.relpath(os.path.dirname(filepath), vault_root)
                if rel_dir and rel_dir != ".":
                    folder = rel_dir
                    top_folder = rel_dir.split(os.sep)[0]
                    category = top_folder
            except Exception:
                pass

        # Clean up category (e.g. '01 - 🎯 Projects' -> '🎯 Projects')
        clean_category = re.sub(r'^\d+\s*[-_]\s*', '', category).strip()
        if not clean_category:
            clean_category = "General"

        return {
            "title": title,
            "content": content,
            "tags": tag_list,
            "links": links,
            "frontmatter": metadata,
            "modified": modified_time,
            "created": created_time,
            "path": filepath,
            "folder": folder,
            "category": clean_category
        }

    def build_graph_data(self, path: str) -> dict:
        notes = self.scan_vault(path)
        nodes = []
        links = []
        note_titles = {n["title"]: idx for idx, n in enumerate(notes)}

        category_colors = {
            "Router": "#0F0F0F",    # Deep Off-Black / Core
            "Wiki": "#1E293B",      # Deep Slate / Navy
            "Concepts": "#80A300",  # Dark Technical Lime
            "Suites": "#312E81",    # Deep Indigo
            "Skills": "#1E3A8A",    # Dark Cobalt Blue
            "Tools": "#881337",     # Deep Burgundy / Maroon
            "Worlds": "#0E7490",    # Deep Dark Cyan
            "Notes": "#27272A",     # Charcoal Zinc 800
            "Files": "#3F3F46"      # Deep Slate 700
        }

        # High-Contrast Technical Brutalist Palette (Darkened for White Background)
        depth_colors = {
            0: "#0F0F0F", # Core Root / Central Hubs (Off-Black / Pitch)
            1: "#80A300", # 1st Level Daughter Nodes (Dark Technical Lime)
            2: "#1E293B", # 2nd Level Grandchildren (Deep Navy Slate)
            3: "#3F3F46", # 3rd Level Sub-branches (Deep Zinc Charcoal)
            4: "#52525B", # 4th Level Fringe Leaves (Muted Slate Zinc)
        }

        top_hubs_map = {}
        all_tags = []

        for idx, n in enumerate(notes):
            category = "Notes"
            folder = os.path.basename(os.path.dirname(n["path"])).lower()
            t_lower = n["title"].lower()
            
            if "skill" in t_lower or "skill" in folder:
                category = "Skills"
            elif "tool" in t_lower or "tool" in folder:
                category = "Tools"
            elif "suite" in t_lower or "suite" in folder:
                category = "Suites"
            elif "world" in t_lower or "world" in folder:
                category = "Worlds"
            elif "concept" in t_lower or "concept" in folder:
                category = "Concepts"
            elif "wiki" in t_lower or "wiki" in folder:
                category = "Wiki"
            elif "router" in t_lower:
                category = "Router"

            link_count = len(n["links"])
            top_hubs_map[n["title"]] = link_count
            all_tags.extend(n["tags"])

            nodes.append({
                "id": str(idx),
                "title": n["title"],
                "category": category,
                "color": category_colors.get(category, "#3b82f6"),
                "connections": link_count,
                "path": n["path"],
                "tags": n["tags"],
                "created": int(n["created"].timestamp() * 1000) if getattr(n, "get", lambda k: None)("created") else int(datetime.now().timestamp() * 1000),
                "content": n["content"] if n["content"] else ""
            })

            # Create edges for wikilinks
            for target in n["links"]:
                target_clean = target.split("|")[0].strip()
                if target_clean in note_titles:
                    links.append({
                        "source": str(idx),
                        "target": str(note_titles[target_clean])
                    })

        # Calculate BFS Depth for all nodes relative to top hub nodes
        adjacency = {node["id"]: [] for node in nodes}
        for link in links:
            adjacency[link["source"]].append(link["target"])
            adjacency[link["target"]].append(link["source"])

        # Top 5 hubs are Depth 0
        sorted_hubs = sorted(top_hubs_map.items(), key=lambda x: x[1], reverse=True)
        top_hub_titles = set(name for name, _ in sorted_hubs[:5])
        
        queue = deque()
        visited_depth = {}

        for node in nodes:
            if node["title"] in top_hub_titles:
                queue.append((node["id"], 0))
                visited_depth[node["id"]] = 0

        while queue:
            curr_id, d = queue.popleft()
            for neighbor_id in adjacency.get(curr_id, []):
                if neighbor_id not in visited_depth:
                    visited_depth[neighbor_id] = d + 1
                    queue.append((neighbor_id, d + 1))

        # Assign calculated depth and depth_color to nodes
        for node in nodes:
            d = visited_depth.get(node["id"], 3)
            node["depth"] = d
            node["depth_color"] = depth_colors.get(min(d, 4), "#10b981")

        # --- SEMANTIC CONSTELLATIONS (AI CLUSTERING) ---
        try:
            from app.core.rag import rag_engine
            # Query the first chunk of each note from ChromaDB
            query_ids = [f'{n["title"]}__chunk_0' for n in nodes]
            db_res = rag_engine.collection.get(ids=query_ids, include=['embeddings'])
            
            if db_res and db_res.get('embeddings') is not None and len(db_res['embeddings']) > 0:
                node_embeddings = {}
                for idx, embedding in zip(db_res['ids'], db_res['embeddings']):
                    if embedding is not None:
                        original_title = idx.split('__chunk_0')[0]
                        node_embeddings[original_title] = embedding
                
                # Map internal graph node ID to its embedding
                embed_data = {}
                for n in nodes:
                    if n["title"] in node_embeddings:
                        embed_data[n["id"]] = node_embeddings[n["title"]]
                
                # Cluster into 6 "Galaxies"
                if len(embed_data) >= 6:
                    clusters = kmeans_cluster(embed_data, k=6)
                    for n in nodes:
                        n["cluster"] = clusters.get(n["id"], 0)
                else:
                    for n in nodes: n["cluster"] = 0
            else:
                for n in nodes: n["cluster"] = 0
        except Exception as e:
            print(f"[Graph Clustering Error]: {e}")
            for n in nodes: n["cluster"] = 0
        # -----------------------------------------------

        # Calculate top hubs
        sorted_hubs_list = sorted_hubs[:8]
        top_hubs = [{"name": name, "count": count} for name, count in sorted_hubs_list]

        # --- BUILD CONSTELLATION LINES ---
        constellation_links = []
        cluster_hubs = {}
        for n in nodes:
            c = n.get("cluster", 0)
            if c not in cluster_hubs:
                cluster_hubs[c] = []
            cluster_hubs[c].append(n)
            
        for c, c_nodes in cluster_hubs.items():
            # Sort by connections descending
            c_nodes_sorted = sorted(c_nodes, key=lambda x: x["connections"], reverse=True)
            top_c = c_nodes_sorted[:4] # Top 4 hubs in this galaxy
            for i in range(len(top_c)):
                for j in range(i + 1, len(top_c)):
                    constellation_links.append({
                        "source": top_c[i]["id"],
                        "target": top_c[j]["id"]
                    })
        # ---------------------------------

        # Category counts (only categories present in vault)
        category_counts = {}
        for cat in category_colors:
            c_count = sum(1 for node in nodes if node["category"] == cat)
            if c_count > 0:
                category_counts[cat] = c_count

        # Tag counts (Top 12 tags in vault)
        tag_counts = dict(Counter(all_tags).most_common(12))

        return {
            "total_notes": len(nodes),
            "total_connections": len(links),
            "nodes": nodes,
            "links": links,
            "constellation_links": constellation_links,
            "top_hubs": top_hubs,
            "category_counts": category_counts,
            "tag_counts": tag_counts,
            "depth_colors": depth_colors
        }

    def predict_missing_links(self, path: str, top_n: int = 8) -> list:
        """Predict unlinked notes that share high semantic similarity."""
        import math

        notes = self.scan_vault(path)
        if len(notes) < 2:
            return []

        existing_links = set()
        note_by_title = {n["title"]: n for n in notes}

        for n in notes:
            s_title = n["title"]
            for target in n["links"]:
                t_clean = target.split("|")[0].strip()
                if t_clean in note_by_title:
                    existing_links.add(tuple(sorted([s_title, t_clean])))

        try:
            from app.core.rag import rag_engine
            query_ids = [f'{n["title"]}__chunk_0' for n in notes]
            db_res = rag_engine.collection.get(ids=query_ids, include=['embeddings'])

            if not db_res or not db_res.get('embeddings') or len(db_res['embeddings']) == 0:
                return []

            embeddings = {}
            for idx, emb in zip(db_res['ids'], db_res['embeddings']):
                if emb is not None:
                    title = idx.split('__chunk_0')[0]
                    embeddings[title] = emb

            def cosine_sim(v1, v2):
                dot = sum(a * b for a, b in zip(v1, v2))
                n1 = math.sqrt(sum(a * a for a in v1))
                n2 = math.sqrt(sum(b * b for b in v2))
                return dot / (n1 * n2) if (n1 > 0 and n2 > 0) else 0.0

            candidates = []
            titles = list(embeddings.keys())

            for i in range(len(titles)):
                for j in range(i + 1, len(titles)):
                    t1 = titles[i]
                    t2 = titles[j]

                    if tuple(sorted([t1, t2])) in existing_links:
                        continue

                    sim = cosine_sim(embeddings[t1], embeddings[t2])
                    if sim >= 0.50:
                        candidates.append({
                            "source": t1,
                            "target": t2,
                            "similarity": round(sim * 100, 1),
                            "score": sim,
                            "source_path": note_by_title[t1]["path"] if t1 in note_by_title else "",
                            "target_path": note_by_title[t2]["path"] if t2 in note_by_title else ""
                        })

            candidates.sort(key=lambda x: x["score"], reverse=True)
            return candidates[:top_n]
        except Exception as e:
            print(f"[Link Prediction Error]: {e}")
            return []

    def connect_notes(self, source_path: str, target_title: str) -> bool:
        """Appends a wikilink [[target_title]] to the source note file."""
        if not source_path or not os.path.exists(source_path):
            return False

        try:
            with open(source_path, 'r', encoding='utf-8') as f:
                content = f.read()

            if f"[[{target_title}]]" in content:
                return True

            link_append = f"\n\n## Related Notes\n- [[{target_title}]]"
            with open(source_path, 'a', encoding='utf-8') as f:
                f.write(link_append)

            return True
        except Exception as e:
            print(f"[Connect Notes Error]: {e}")
            return False

    def get_backlinks(self, path: str, target_title: str) -> dict:
        """Finds all notes in the vault that link to target_title, with context snippets."""
        notes = self.scan_vault(path)
        backlinks = []
        forward_links = []

        target_title_clean = target_title.split("|")[0].strip().lower()

        target_note = None
        for n in notes:
            if n["title"].lower() == target_title_clean:
                target_note = n
                break

        if target_note and target_note.get("links"):
            for link in target_note["links"]:
                clean_link = link.split("|")[0].strip()
                if clean_link and clean_link.lower() != target_title_clean:
                    forward_links.append({
                        "title": clean_link,
                        "alias": link.split("|")[1].strip() if "|" in link else ""
                    })

        for n in notes:
            if n["title"].lower() == target_title_clean:
                continue

            content = n.get("content", "")
            matches = re.findall(rf'\[\[({re.escape(target_title)}(?:\|.*?)?)\]\]', content, re.IGNORECASE)
            if matches or any(l.split("|")[0].strip().lower() == target_title_clean for l in n.get("links", [])):
                lines = content.splitlines()
                snippet = ""
                for line in lines:
                    if target_title_clean in line.lower():
                        snippet = line.strip()
                        break
                if not snippet and lines:
                    snippet = lines[0].strip()

                backlinks.append({
                    "title": n["title"],
                    "path": n["path"],
                    "tags": n["tags"],
                    "snippet": snippet[:200]
                })

        return {
            "title": target_title,
            "backlinks": backlinks,
            "backlink_count": len(backlinks),
            "forward_links": forward_links,
            "forward_count": len(forward_links)
        }

obsidian_parser = ObsidianParser()
obsidian_service = obsidian_parser
