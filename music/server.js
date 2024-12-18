const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const HOST = '0.0.0.0';

const app = express();
app.use(express.static('.'));
app.use(bodyParser.json());

const uri = 'mongodb+srv://mayank:mayank@cluster0.sbmqi.mongodb.net/musicApp?retryWrites=true&w=majority';

mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch((err) => console.error('MongoDB connection error:', err));

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    favorites: { type: Array, default: [] }
});

module.exports = mongoose.model('User', UserSchema);


const User = mongoose.model('User', UserSchema, 'users');
const cors = require('cors');
app.use(cors());

app.post('/signup', async (req, res) => {
    console.log('Signup request received:', req.body);
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ error: 'User already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword });
        await user.save();
        res.status(200).json({ message: 'Signup successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/login', async (req, res) => {
    console.log('Login request received:', req.body);
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.json({ success: false, message: 'Invalid credentials' });
    }

    res.json({ success: true, userId: user._id });
});

app.post('/addFavorite', async (req, res) => {
    const { username, song } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const songIndex = user.favorites.findIndex(favSong => favSong.name === song.name);

        if (songIndex === -1) {
            user.favorites.push(song);
        } else {
            user.favorites.splice(songIndex, 1);
        }

        await user.save();
        res.status(200).json({ message: 'Favorite song updated', favorites: user.favorites });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update favorite song' });
    }
});

app.get('/favorites/:username', async (req, res) => {
    const { username } = req.params;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ favorites: user.favorites });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch favorites' });
    }
});

app.listen(3000, HOST, () => {
    console.log(`Server running on http://0.0.0.0:3000`);
});