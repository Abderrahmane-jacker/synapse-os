import random
import math
from typing import Dict, List, Tuple

def euclidean_distance(v1: List[float], v2: List[float]) -> float:
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(v1, v2)))

def kmeans_cluster(data_points: Dict[str, List[float]], k: int = 5, max_iterations: int = 50) -> Dict[str, int]:
    """
    Groups vectors into k clusters using the K-Means algorithm.
    :param data_points: Dict mapping node_id to its embedding vector.
    :param k: Number of clusters (Galaxies).
    :return: Dict mapping node_id to cluster index (0 to k-1).
    """
    ids = list(data_points.keys())
    vectors = list(data_points.values())
    
    if not vectors:
        return {}
        
    n_points = len(vectors)
    if n_points < k:
        k = n_points
        
    if k == 0:
        return {}

    # Initialize centroids by randomly selecting k data points
    random.seed(42) # Deterministic layout
    centroids = random.sample(vectors, k)
    clusters = {i: [] for i in range(k)}
    
    for _ in range(max_iterations):
        new_clusters = {i: [] for i in range(k)}
        
        # Assign each point to the nearest centroid
        for idx, vec in enumerate(vectors):
            distances = [euclidean_distance(vec, c) for c in centroids]
            min_dist_idx = distances.index(min(distances))
            new_clusters[min_dist_idx].append(idx)
            
        # Update centroids
        new_centroids = []
        for i in range(k):
            if new_clusters[i]:
                # Calculate mean of all points in this cluster
                avg_vec = [
                    sum(vectors[idx][dim] for idx in new_clusters[i]) / len(new_clusters[i])
                    for dim in range(len(vectors[0]))
                ]
                new_centroids.append(avg_vec)
            else:
                new_centroids.append(centroids[i])
                
        # Check for convergence
        converged = True
        for c1, c2 in zip(centroids, new_centroids):
            if euclidean_distance(c1, c2) > 1e-4:
                converged = False
                break
                
        if converged:
            clusters = new_clusters
            break
            
        centroids = new_centroids
        clusters = new_clusters

    # Map indices back to original IDs
    result = {}
    for cluster_id, indices in clusters.items():
        for idx in indices:
            result[ids[idx]] = cluster_id
            
    return result
