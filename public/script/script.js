// DOM Elements
const featuredBooks = document.getElementById('featured-books');
const cartCount = document.querySelector('.cart-count');
const searchBtn = document.querySelector('.search-btn');
const profileBtn = document.querySelector('.profile-btn');
const loginSection = document.getElementById('login-section');
const logoutLink = document.getElementById('logout-link');

// Authentication state
let isAuthenticated = false;
// Render featured books
function renderFeaturedBooks() {
  books.forEach(book => {
    const bookCard = document.createElement('div');
    bookCard.className = 'book-card';
    bookCard.innerHTML = `
      <img src="${book.image}" alt="${book.title}">
      <div class="book-info">
        <h3>${book.title}</h3>
        <p>${book.author}</p>
        <p class="price">₹${book.price}</p>
        <button class="btn primary" onclick="addToCart(${book.id})">Add to Cart</button>
      </div>
    `;
    featuredBooks.appendChild(bookCard);
  });
}

// Cart functionality
let cart = [];

function addToCart(bookId) {
  const book = books.find(b => b.id === bookId);
  if (book) {
    cart.push(book);
    updateCartCount();
    showNotification('Book added to cart!');
  }
}

function updateCartCount() {
  cartCount.textContent = cart.length;
}

// Notification system
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Update UI based on authentication status
function updateAuthUI() {
  if (isAuthenticated) {
    loginSection.style.display = 'none';
    logoutLink.style.display = 'flex';
  } else {
    loginSection.style.display = 'block';
    logoutLink.style.display = 'none';
  }
}

// Fetch session status from server
async function checkSession() {
  try {
    const response = await fetch('/get-session');
    const data = await response.json();
    isAuthenticated = data.loggedIn;
    updateAuthUI();
  } catch (error) {
    console.error('Error checking session:', error);
  }
}

// Logout functionality
async function logout() {
  try {
    const response = await fetch('/logout', { method: 'POST' });
    if (response.ok) {
      isAuthenticated = false;
      updateAuthUI();
      showNotification('Logged out successfully!');
      window.location.href = '/login.html'; // Redirect to login page
    } else {
      showNotification('Logout failed. Please try again.');
    }
  } catch (error) {
    console.error('Error during logout:', error);
    showNotification('Logout failed due to an error.');
  }
}

// Search functionality
searchBtn.addEventListener('click', () => {
  console.log('Search clicked');
});

// Profile dropdown toggle
profileBtn.addEventListener('click', () => {
  const dropDown = document.querySelector('.dropdown-content');
  dropDown.classList.toggle('show');
});

// Handle logout click
logoutLink.addEventListener('click', (e) => {
  e.preventDefault();
  logout();
});

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  renderFeaturedBooks();
  updateCartCount();
  checkSession(); // Check session status on page load
});

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    document.querySelector(this.getAttribute('href')).scrollIntoView({
      behavior: 'smooth'
    });
  });
});

// Intersection Observer for animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate');
    }
  });
}, {
  threshold: 0.1
});

document.querySelectorAll('.book-card, .category-card, .step').forEach((element) => {
  observer.observe(element);
});

// Fetch and display latest ads
document.addEventListener("DOMContentLoaded", function () {
  const adsContainer = document.getElementById("ads-container");

  async function fetchAds() {
    try {
      let response = await fetch("/api/books");
      let ads = await response.json();

      adsContainer.innerHTML = ""; // Clear previous ads

      ads.forEach(ad => {
        let adElement = document.createElement("div");
        adElement.classList.add("book-card");

        adElement.innerHTML = `
          <img src="${ad.images[0] || 'default-book.jpg'}" alt="${ad.title}">
          <h3 class="book-title">${ad.title}</h3>
          <p class="book-price">₹${ad.price}</p>
          <a href="/books/${ad._id}" class="view-btn">View Ad</a>
        `;

        adsContainer.appendChild(adElement);
      });
    } catch (error) {
      console.error("Error fetching ads:", error);
    }
  }

  fetchAds(); // Call function on page load
});