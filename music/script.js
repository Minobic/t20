async function searchSong(query) {
    const url = `https://shazam.p.rapidapi.com/search?term=${encodeURIComponent(query)}&locale=en-US&offset=0&limit=10`;
    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': 'cd9e298af0mshe4bd55475ae7836p14225cjsneb69e2348b34',
            'x-rapidapi-host': 'shazam.p.rapidapi.com',
        },
    };

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        return data.tracks.hits.map(hit => hit.track);
    } catch (error) {
        console.error('Error fetching song data:', error);
        return [];
    }
}


function updatePlayer(song) {
    document.getElementById('songPoster').src = song.images.coverart;
    document.getElementById('songTitle').textContent = song.title;
    document.getElementById('songArtist').textContent = song.subtitle;
    document.getElementById('audioPlayer').src = song.hub.actions[1]?.uri || '';

    updateFavIcon();
}

const searchResultsContainer = document.getElementById('searchResults');

function displaySearchResults(songs) {
    searchResultsContainer.innerHTML = '';
    songs.forEach((song) => {
        const resultElement = document.createElement('div');
        resultElement.classList.add('result');

        const poster = document.createElement('img');
        poster.src = song.images.coverart;
        poster.alt = `${song.title} Poster`;
        poster.classList.add('poster');

        const songInfo = document.createElement('div');
        songInfo.classList.add('song-info');
        songInfo.innerHTML = `<strong>${song.title}</strong> - ${song.subtitle}`;

        resultElement.appendChild(poster);
        resultElement.appendChild(songInfo);

        resultElement.addEventListener('click', () => {
            updatePlayer(song);
            switchToNewSong(song);
            searchResultsContainer.style.display = 'none';
        });

        searchResultsContainer.appendChild(resultElement);
    });
    searchResultsContainer.style.display = 'block';
}

document.getElementById('searchInput').addEventListener('input', async (e) => {
    const query = e.target.value;
    if (!query) {
        searchResultsContainer.style.display = 'none';
        return;
    }

    const songs = await searchSong(query);
    if (songs.length > 0) {
        displaySearchResults(songs);
    } else {
        searchResultsContainer.innerHTML = '<div>No results found</div>';
        searchResultsContainer.style.display = 'block';
    }
});

document.getElementById('searchInput').addEventListener('click', (event) => {
    const query = event.target.value;
    if (query) {
        searchResultsContainer.style.display = 'block';
    }
    event.stopPropagation();
});

document.addEventListener('click', (event) => {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    if (!searchInput.contains(event.target) && !searchResults.contains(event.target)) {
        searchResults.style.display = 'none';
    }
});

async function toggleFavorite(song) {
    const username = localStorage.getItem('username');
    if (!username) {
        alert('Please log in first.');
        return;
    }

    const response = await fetch('https://improved-space-tribble-5jqwwxjx77rhp677.github.dev/addFavorite', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, song }),
    });

    const data = await response.json();
    updateFavIcon();
    console.log(data.message);
}

async function fetchFavorites() {
    const username = localStorage.getItem('username');
    if (!username) {
        alert('Please log in first.');
        return [];
    }

    const response = await fetch(`http://improved-space-tribble-5jqwwxjx77rhp677.github.dev/favorites/${username}`);
    const data = await response.json();
    return data.favorites;
}

document.getElementById('favSongIcon').addEventListener('click', async () => {
    const song = {
        album: {
            images: [
                { url: document.getElementById('songPoster').src },
            ],
        },
        name: document.getElementById('songTitle').textContent,
        artists: document.getElementById('songArtist').textContent
            .split(', ')
            .map((name) => ({ name })),
        preview_url: document.getElementById('audioPlayer').src,
    };

    await toggleFavorite(song);
});

document.getElementById('favIcon').addEventListener('click', async () => {
    const favModal = document.createElement('div');
    favModal.id = 'favSongsModal';
    favModal.classList.add('show');

    const modalContent = document.createElement('div');
    modalContent.classList.add('content');

    const favorites = await fetchFavorites();
    if (favorites.length > 0) {
        favorites.forEach((song) => {
            const songElement = document.createElement('div');
            songElement.classList.add('result');

            songElement.innerHTML = `
                <img src="${song.album.images[0].url}" class="poster" />
                <div class="song-info">
                    <strong>${song.name}</strong> - ${song.artists.map(artist => artist.name).join(', ')}
                </div>
            `;

            songElement.addEventListener('click', () => {
                const formattedSong = {
                    images: { coverart: song.album.images[0].url },
                    title: song.name,
                    subtitle: song.artists.map(artist => artist.name).join(', '),
                    hub: {
                        actions: [
                            null,
                            { uri: song.preview_url || '' },
                        ],
                    },
                };

                switchToNewSong(formattedSong);
                favModal.remove();
            });

            modalContent.appendChild(songElement);
        });
    } else {
        modalContent.innerHTML = '<div>No favorite songs yet.</div>';
    }

    favModal.appendChild(modalContent);
    document.body.appendChild(favModal);

    favModal.addEventListener('click', (e) => {
        if (e.target === favModal) {
            favModal.remove();
        }
    });
});

function updateFavIcon() {
    const songTitle = document.getElementById('songTitle').textContent;
    const path = document.getElementById('favSongIcon').querySelector('svg path');
    const path2 = document.getElementById('favIcon').querySelector('svg path');

    fetchFavorites().then((favorites) => {
        const isFavorite = favorites.some(favSong => favSong.name === songTitle);
        path.setAttribute('fill', isFavorite ? 'red' : 'rgb(85, 84, 84)');
        path2.setAttribute('fill', favorites.length > 0 ? 'red' : 'black');
    });
}

function logout() {
    localStorage.removeItem('username');
    window.location.href = 'login.html';
}

const username = localStorage.getItem('username');
if (username) {
    document.getElementById('username').textContent = username;
} else {
    window.location.href = 'login.html';
}

document.getElementById('logout').addEventListener('click', () => {
    logout();
});

let lyricsInterval = null;
let currentSong = null;

async function fetchLyrics(songTitle, songArtist) {
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(songArtist)}/${encodeURIComponent(songTitle)}`;
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.lyrics) {
            const parsedLyrics = parseLyrics(data.lyrics);
            return parsedLyrics;
        } else {
            return [];
        }
    } catch (error) {
        console.error('Error fetching lyrics:', error);
        return [];
    }
}

function parseLyrics(rawLyrics) {
    const lines = rawLyrics.split('\n');
    return lines.map((line) => ({
        text: line,
    }));
}

function displayLyrics() {
    const lyricsContainer = document.getElementById('lyricsContainer');
    lyricsContainer.innerHTML = '';

    if (lyrics && lyrics.length > 0) {
        lyrics.forEach((line, index) => {
            const lineElement = document.createElement('span');
            lineElement.textContent = line.text;
            lineElement.dataset.index = index;
            lineElement.classList.add('lyric-line');
            lyricsContainer.appendChild(lineElement);
        });

        const posterContainer = document.getElementById('posterContainer');
        posterContainer.style.display = 'none';
        lyricsContainer.style.display = 'block';

        const showLyricsButton = document.getElementById('showLyricsButton');
        showLyricsButton.textContent = 'Lyrics';
        showLyricsButton.style.textShadow = "0 0 10px #fff, 0 0 20px #fff, 0 0 30px white, 0 0 40px white, 0 0 50px white, 0 0 60px white, 0 0 70px white";
    } else {
        alert('Lyrics not found for this song.');
    }
}

function hideLyrics() {
    const lyricsContainer = document.getElementById('lyricsContainer');
    lyricsContainer.style.display = 'none';

    lyricsContainer.innerHTML = '';

    const posterContainer = document.getElementById('posterContainer');
    posterContainer.style.display = 'block';

    const showLyricsButton = document.getElementById('showLyricsButton');
    showLyricsButton.textContent = 'Lyrics';
    showLyricsButton.style.color = 'white';
    showLyricsButton.style.textShadow = 'none';
}

document.getElementById('showLyricsButton').addEventListener('click', async () => {
    const songTitle = document.getElementById('songTitle').textContent;
    const songArtist = document.getElementById('songArtist').textContent;

    if (!currentSong || currentSong.title !== songTitle || currentSong.artist !== songArtist) {
        lyrics = await fetchLyrics(songTitle, songArtist);
        if (lyrics.length > 0) {
            displayLyrics();
            currentSong = { title: songTitle, artist: songArtist };

            if (lyricsInterval) clearInterval(lyricsInterval);
        } else {
            alert('Lyrics not found for this song.');
        }
    } else {
        const lyricsContainer = document.getElementById('lyricsContainer');
        if (lyricsContainer.style.display === 'block') {
            hideLyrics();
        } else {
            displayLyrics();
        }
    }
});

function switchToNewSong(song) {
    hideLyrics();

    updatePlayer(song);

    currentSong = {
        title: song.title,
        artist: song.subtitle,
    };

    const showLyricsButton = document.getElementById('showLyricsButton');
    showLyricsButton.textContent = 'Lyrics';

    fetchLyrics(song.title, song.subtitle).then(fetchedLyrics => {
        lyrics = fetchedLyrics;
    });
}

document.getElementById('moodIcon').addEventListener('click', (event) => {
    event.stopPropagation();
    const moodModal = document.getElementById('moodModal');
    moodModal.style.display = moodModal.style.display === 'none' || moodModal.style.display === '' ? 'block' : 'none';
});

document.addEventListener('click', (event) => {
    const moodModal = document.getElementById('moodModal');
    const moodIcon = document.getElementById('moodIcon');

    if (!moodModal.contains(event.target) && event.target !== moodIcon) {
        moodModal.style.display = 'none';
    }
});

document.querySelectorAll('.mood-option').forEach((button) => {
    button.addEventListener('click', async (event) => {
        const mood = event.target.getAttribute('data-mood');
        const song = await getSongForMood(mood);
        if (song) {
            updatePlayer(song);
            switchToNewSong(song);
        }
        document.getElementById('moodModal').style.display = 'none';
    });
});

let moodSongsCache = {};
let lastPlayedSongIndex = {};

async function getSongForMood(mood) {
    let query = '';

    switch (mood) {
        case 'happy':
            query = 'happy bollywood songs';
            break;
        case 'sad':
            query = 'sad bollywood songs';
            break;
        case 'energetic':
            query = 'energetic bollywood songs';
            break;
        case 'chill':
            query = 'chill bollywood songs';
            break;
        case 'excited':
            query = 'exciting bollywood songs';
            break;
        case 'relaxed':
            query = 'relaxed hindi songs';
            break;
        case 'angry':
            query = 'angry bollywood songs';
            break;
        case 'hopeful':
            query = 'hopeful bollywood songs';
            break;
        case 'inspired':
            query = 'inspirational bollywood songs';
            break;
        case 'romantic':
            query = 'romantic bollywood songs';
            break;
        case 'adventurous':
            query = 'adventurous bollywood songs';
            break;
        case 'nostalgic':
            query = 'nostalgic bollywood songs';
            break;
        case 'peaceful':
            query = 'peaceful bollywood songs';
            break;
        case 'confident':
            query = 'confident bollywood songs';
            break;
        case 'melancholic':
            query = 'melancholic bollywood songs';
            break;
        case 'playful':
            query = 'playful bollywood songs';
            break;
        case 'mellow':
            query = 'mellow bollywood songs';
            break;
        case 'bored':
            query = 'bored bollywood songs';
            break;
        case 'creative':
            query = 'creative bollywood songs';
            break;
        case 'serene':
            query = 'serene bollywood songs';
            break;
        case 'thoughtful':
            query = 'thoughtful bollywood songs';
            break;
        default:
            alert('Mood not recognized');
            return null;
    }

    if (!moodSongsCache[mood]) {
        const songs = await searchSong(query);
        moodSongsCache[mood] = songs;
        lastPlayedSongIndex[mood] = -1;
    }

    const songs = moodSongsCache[mood];

    if (songs.length === 0) {
        return null;
    }

    const nextSongIndex = (lastPlayedSongIndex[mood] + 1) % songs.length;
    lastPlayedSongIndex[mood] = nextSongIndex;

    return songs[nextSongIndex];
}

updateFavIcon();