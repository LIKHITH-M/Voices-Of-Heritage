const router = require('express').Router();
const { getProfile, updateProfile, getActivityHistory, logActivity } = require('../controllers/profile.controller');
const { validate, updateProfileSchema } = require('../validations/auth.schema');

router.get('/profile', getProfile);
router.put('/profile', validate(updateProfileSchema), updateProfile);
router.get('/activity', getActivityHistory);
router.post('/activity', logActivity); // Internal — called by other services

module.exports = router;
