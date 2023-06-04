const apiKey = window.apiKey;
const genreSelect = document.getElementById("genre-select");
const searchBtn = document.getElementById("search-btn");
const showList = document.getElementById("show-list");
const customGenreInput = document.querySelector("#freesearch");
const button = document.getElementById("search-btn");

function toggleButton() {
  if (button.hasAttribute("disabled")) {
    // Enable the button
    button.removeAttribute("disabled", "disabled");
    // Set the original text
    button.innerText = "Search";
  } else {
    // Disable the button
    button.setAttribute("disabled", "disabled");
    // Set the loading text and spinner
    button.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
  }
}

function getGenres() {
  // Fetch the list of shows from the TVmaze API
  fetch("https://api.tvmaze.com/shows")
    .then((response) => response.json())
    .then((shows) => {
      // Extract unique genres from the shows
      const genres = new Set();
      shows.forEach((show) => {
        show.genres.forEach((genre) => {
          genres.add(genre);
        });
      });

      // Add genres to the dropdown
      const option = document.createElement("option");
      option.value = "Select";
      option.textContent = "Select from the list";
      genreSelect.appendChild(option);
      genres.forEach((genre) => {
        const option = document.createElement("option");
        option.value = genre;
        option.textContent = genre;
        genreSelect.appendChild(option);
      });
    })
    .catch((error) => console.error("Error fetching genres:", error));
}

getGenres();

const fetchImageURL = async (show) => {
  toggleButton();
  let apiURL = "";
  if (show.type === "TVShow") {
    // MazeTV API for TV shows
    apiURL = `https://api.tvmaze.com/singlesearch/shows?q=${show.title}`;
  } else {
    // OMDB API for movies
    apiURL = `https://www.omdbapi.com/?t=${show.title}&apikey=1400e9a9`;
  }

  try {
    const response = await fetch(apiURL);
    const data = await response.json();
    let imageURL = "";
    if (show.type === "TVShow") {
      imageURL = data.image.medium; // Modify this based on the response structure of the MazeTV API
    } else {
      imageURL = data.Poster; // Modify this based on the response structure of the OMDB API
    }

    return imageURL;
  } catch (error) {
    console.log("Error fetching image:", error);
    return null;
  }
};

const fetchImdbRating = async (show) => {
  let apiURL = `https://www.omdbapi.com/?apikey=1400e9a9&i=${show}`;
  try {
    const response = await fetch(apiURL);
    const data = await response.json();
    if (data.imdbID) {
      return data.imdbRating;
    } else {
      return "N/A";
    }
  } catch (error) {
    console.log("Error fetching image:", error);
    return null;
  }
};

// Fetch shows and movies based on the selected genre
function fetchShowsAndMovies(selectedGenre) {
  // Clear the previous results
  showList.innerHTML = "";
  genreSelect.value = "Select";
  // Fetch TV shows by the selected genre from the TVmaze API
  fetch(`https://api.tvmaze.com/shows`)
    .then((response) => response.json())
    .then((shows) => {
      const filteredShows = shows.filter((show) =>
        show.genres.includes(selectedGenre)
      );
      filteredShows.forEach((show) => {
        fetchImdbRating(show.externals.imdb).then((rating) => {
          show.imdbRating = rating;
          createCard(show);
        });
      });
    })
    .catch((error) => console.error("Error fetching TV shows:", error));

  // Fetch movies by the selected genre from the OMDb API
  fetch(`http://www.omdbapi.com/?apikey=1400e9a9&type=movie&s=${selectedGenre}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.Response === "True") {
        const movies = data.Search;
        movies.forEach((movie) => {
          fetch(`http://www.omdbapi.com/?apikey=1400e9a9&i=${movie.imdbID}`)
            .then((response) => response.json())
            .then((m) => {
              createCard(m);
            })
            .catch((error) =>
              console.log("Error fetching data from imdb", error)
            );
        });
      } else {
        console.error("Error fetching movies:", data.Error);
      }
    })
    .catch((error) => console.error("Error fetching movies:", error));
}

//Function to send a message to the ChatGPT API
function sendMessageToChatGPT(customGenre) {
  showList.innerHTML = "";
  const queryToGPT = `Please recommend ONLY three TV Shows or Movies in the ${customGenre} Genre,
                      Answer by a json object with the properties-
                      title as title,
                      short summary as summary,
                      link to imdb as imdb,
                      TVShow or Movie as type`;
  customGenreInput.value = "";
  return new Promise((resolve, reject) => {
    toggleButton();
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey, // Replace with your OpenAI API key
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You" },
          { role: "user", content: queryToGPT },
        ],
        max_tokens: 500,
        temperature: 1,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        const results = Object.values(
          JSON.parse(data.choices[0].message.content)
        );
        results.forEach(async (show) => {
          try {
            const image = await fetchImageURL(show);
            show.image = image;
            const rating = await fetchImdbRating(
              show.imdb.match(/\/title\/(tt\d+)/)[1]
            );
            show.imdbRating = rating;
            createCard(show);
          } catch (error) {
            console.error(error);
          }
        });
      })
      .catch((error) => reject(console.log(error)));
  });
}

function createCard(show) {
  // Create the card element
  const card = document.createElement("div");
  card.classList.add("card");
  card.style.width = "13rem";

  // Create the image element
  const image = document.createElement("img");
  if (show && show.image && show.image.medium) {
    image.src = show.image.medium;
    image.alt = show.name;
  } else if (show.image) {
    image.src = show.image;
    image.alt = show.title;
  } else if (show.Poster !== "N/A") {
    image.src = show.Poster;
    image.alt = show.Title;
  } else {
    image.src =
      "https://s3.youthkiawaaz.com/wp-content/uploads/2017/09/12094914/No-Poster-Party-logo-2017.jpg";
  }
  image.classList.add("card-img-top");

  // Create the card body element
  const cardBody = document.createElement("div");
  cardBody.classList.add("card-body");

  // Create the card title element
  const title = document.createElement("h5");
  title.classList.add("card-title");
  if (show && show.name) {
    title.textContent = show.name + " (TV Show)";
  } else if (show.title) {
    if (show.title === "Movie") {
      title.textContent = show.title + " (Movie)";
    } else {
      title.textContent = show.title + " (TV Show)";
    }
  } else {
    title.textContent = show.Title + " (Movie)";
  }

  // Create the card text element
  const text = document.createElement("p");
  text.classList.add("card-text");
  if (show.summary) {
    text.innerHTML = show.summary;
  } else {
    text.innerHTML = show.Plot;
  }
  text.style.fontSize = "0.7rem";

  // Create the link element
  const link = document.createElement("a");
  if (show.url) {
    link.href = show.url;
  } else if (show.imdb) {
    link.href = show.imdb;
  } else if (show.Poster !== "N/A") {
    link.href = show.Poster;
  } else {
    link.href =
      "https://s3.youthkiawaaz.com/wp-content/uploads/2017/09/12094914/No-Poster-Party-logo-2017.jpg";
  }
  link.setAttribute("target", "_blank");
  link.classList.add("btn", "btn-primary", "mt-auto");
  link.innerHTML =
    "<i class='fa fa-sharp fa-light fa-book fa-sm'></i> Read More"; // Replace 'Go somewhere' with your desired link text

  const rating = document.createElement("p");
  rating.classList.add("card-text");
  rating.innerHTML = `<span class="fa" style="color: #ffdd00;">IMDB RATING</span><br/><i class="fa-sharp fa-solid fa-star fa-bounce" style="color: #ffdd00;">${show.imdbRating}</i>`;

  // Append the elements together
  cardBody.appendChild(title);
  cardBody.appendChild(rating);
  cardBody.appendChild(text);
  cardBody.appendChild(link);
  card.appendChild(image);
  card.appendChild(cardBody);

  // Append the card to an existing element in the HTML (e.g., the body)
  showList.appendChild(card);
}

<<<<<<< HEAD
=======
// Fetch shows and movies based on the selected genre
function fetchShowsAndMovies(selectedGenre) {
  // Clear the previous results
  showList.innerHTML = "";
  genreSelect.value = "Select";
  // Fetch TV shows by the selected genre from the TVmaze API
  fetch(`https://api.tvmaze.com/shows`)
    .then((response) => response.json())
    .then((shows) => {
      const filteredShows = shows.filter((show) =>
        show.genres.includes(selectedGenre)
      );
      // filteredShows.forEach((show) => {
      //   const showItem = document.createElement("div");
      //   showItem.textContent = show.name + " (TV Show)";
      //   showList.appendChild(showItem);
      // });
      filteredShows.forEach((show) => {
        createCard(show);
      });
    })
    .catch((error) => console.error("Error fetching TV shows:", error));

  // Fetch movies by the selected genre from the OMDb API
  fetch(`http://www.omdbapi.com/?apikey=1400e9a9&type=movie&s=${selectedGenre}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.Response === "True") {
        const movies = data.Search;
        movies.forEach((movie) => {
          // const movieItem = document.createElement("div");
          // movieItem.textContent = movie.Title + " (Movie)";
          // showList.appendChild(movieItem);
          // console.log(movie);
          fetch(`http://www.omdbapi.com/?apikey=1400e9a9&i=${movie.imdbID}`)
            .then((response) => response.json())
            .then((m) => createCard(m))
            .catch((error) =>
              console.log("Error fetching data from imdb", error)
            );
        });
      } else {
        console.error("Error fetching movies:", data.Error);
      }
    })
    .catch((error) => console.error("Error fetching movies:", error));
}

//Function to send a message to the ChatGPT API
function sendMessageToChatGPT(customGenre) {
  showList.innerHTML = "";
  const queryToGPT = `Please recommend ONLY one TV Show or Movie in the ${customGenre} Genre,
                      Answer by a json object with the properties -
                      title as title,
                      short summary as summary,
                      link to imdb as imdb,
                      TVShow or Movie as type`;
  customGenreInput.value = "";
  return new Promise((resolve, reject) => {
    toggleButton();
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Bearer ADD_API_KEY", // Replace with your OpenAI API key
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You" },
          { role: "user", content: queryToGPT },
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        const showObject = JSON.parse(data.choices[0].message.content);
        fetchImageURL(showObject).then((image) => {
          showObject.image = image;
          createCard(showObject);
        });
      })
      .catch((error) => reject(console.log(error)));
  });
}

>>>>>>> d38d6087f4805488e44072c52ed0efef35c6b05f
// Event listener for the search button
searchBtn.addEventListener("click", (event) => {
  event.preventDefault();
  if (genreSelect.value !== "Select") {
    fetchShowsAndMovies(genreSelect.value);
  } else {
    sendMessageToChatGPT(customGenreInput.value);
  }
});
