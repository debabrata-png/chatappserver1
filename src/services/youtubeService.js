const { google } = require('googleapis');

class YouTubeService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('YouTube API key is required');
    }
    
    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey
    });
  }

  async searchEducationalVideos(topic, options = {}) {
    try {
      const {
        maxResults = 5,
        courseLevel = '',
        duration = 'medium', // short (< 4 min), medium (4-20 min), long (> 20 min)
        order = 'relevance',
        publishedAfter = null
      } = options;

      // Construct search query
      const searchTerms = [
        topic,
        courseLevel,
        'educational',
        'tutorial',
        'explanation',
        'lecture'
      ].filter(Boolean).join(' ');

      const searchParams = {
        part: 'snippet',
        q: searchTerms,
        type: 'video',
        maxResults,
        videoDuration: duration,
        safeSearch: 'strict',
        relevanceLanguage: 'en',
        order,
        videoEmbeddable: 'true',
        videoLicense: 'any'
      };

      // Add date filter if specified
      if (publishedAfter) {
        searchParams.publishedAfter = publishedAfter.toISOString();
      }
      
      const response = await this.youtube.search.list(searchParams);

      if (!response.data.items || response.data.items.length === 0) {
        return [];
      }

      // Transform results
      const videos = response.data.items.map(item => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        channelName: item.snippet.channelTitle,
        publishedAt: new Date(item.snippet.publishedAt),
        description: item.snippet.description
      }));
      return videos;

    } catch (error) {
      console.error('YouTube API Error:', error);
      
      if (error.code === 403) {
        throw new Error('YouTube API quota exceeded or invalid API key');
      } else if (error.code === 400) {
        throw new Error('Invalid YouTube API request parameters');
      }
      
      throw new Error(`YouTube search failed: ${error.message}`);
    }
  }

  async getVideoDetails(videoId) {
    try {
      const response = await this.youtube.videos.list({
        part: 'contentDetails,statistics,snippet',
        id: videoId
      });

      if (!response.data.items || response.data.items.length === 0) {
        return null;
      }

      const video = response.data.items[0];
      return {
        duration: video.contentDetails.duration,
        viewCount: video.statistics.viewCount,
        likeCount: video.statistics.likeCount,
        description: video.snippet.description,
        tags: video.snippet.tags || []
      };
    } catch (error) {
      console.error('YouTube video details error:', error);
      return null;
    }
  }
}

module.exports = YouTubeService;
