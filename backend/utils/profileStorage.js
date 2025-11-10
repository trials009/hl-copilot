// In-memory storage for business profiles
// In production, use a database (MongoDB, PostgreSQL, etc.)

const profiles = new Map();

/**
 * Get business profile for a user
 */
function getBusinessProfile(userId) {
  return profiles.get(userId) || null;
}

/**
 * Update business profile for a user
 */
function updateBusinessProfile(userId, updates) {
  const existing = profiles.get(userId) || {};
  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  profiles.set(userId, updated);
  return updated;
}

/**
 * Create or update business profile
 */
function saveBusinessProfile(userId, profileData) {
  const profile = {
    userId,
    industry: profileData.industry || null,
    audience: profileData.audience || null,
    tone: profileData.tone || null,
    contentPreferences: profileData.contentPreferences || null,
    facebookConnected: profileData.facebookConnected || false,
    facebookPageId: profileData.facebookPageId || null,
    createdAt: profiles.get(userId)?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  profiles.set(userId, profile);
  return profile;
}

/**
 * Get all profiles (for debugging/admin)
 */
function getAllProfiles() {
  return Array.from(profiles.entries()).map(([userId, profile]) => ({
    userId,
    ...profile
  }));
}

module.exports = {
  getBusinessProfile,
  updateBusinessProfile,
  saveBusinessProfile,
  getAllProfiles
};

