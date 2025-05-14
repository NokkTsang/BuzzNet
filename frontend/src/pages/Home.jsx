const fetchPosts = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('https://buzz-net-rose.vercel.app/api/posts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch posts');
    }

    const data = await response.json();
    setPosts(data);
  } catch (error) {
    console.error('Error fetching posts:', error);
  }
}; 
