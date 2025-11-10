const express = require('express');
const router = express.Router();
const { 
  getBusinessProfile, 
  updateBusinessProfile, 
  saveBusinessProfile 
} = require('../utils/profileStorage');

/**
 * GET /api/profile/:userId
 * Get business profile for a user
 */
router.get('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const profile = getBusinessProfile(userId);
    
    if (!profile) {
      return res.status(404).json({ 
        error: 'Profile not found',
        message: 'No business profile found for this user. Start a conversation to create one.'
      });
    }
    
    res.json({ profile });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch profile',
      details: error.message 
    });
  }
});

/**
 * POST /api/profile/:userId
 * Create or update business profile
 */
router.post('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const profileData = req.body;
    
    const profile = saveBusinessProfile(userId, profileData);
    
    res.json({ 
      message: 'Profile saved successfully',
      profile 
    });
  } catch (error) {
    console.error('Profile save error:', error);
    res.status(500).json({ 
      error: 'Failed to save profile',
      details: error.message 
    });
  }
});

/**
 * PATCH /api/profile/:userId
 * Update specific fields of business profile
 */
router.patch('/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    const updatedProfile = updateBusinessProfile(userId, updates);
    
    res.json({ 
      message: 'Profile updated successfully',
      profile: updatedProfile 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      error: 'Failed to update profile',
      details: error.message 
    });
  }
});

module.exports = router;

