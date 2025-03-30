document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    checkLoginStatus()
        .then(isLoggedIn => {
            if (!isLoggedIn) {
                // Redirect to login page if not logged in
                window.location.href = '/login.html';
                return;
            }
            
            // Fetch and display the user's ads
            fetchUserAds();
        })
        .catch(error => {
            console.error('Error checking login status:', error);
            displayErrorMessage('Error checking login status. Please try again later.');
        });
});

/**
 * Check if the user is logged in
 * @returns {Promise<boolean>} Promise resolving to true if user is logged in, false otherwise
 */
async function checkLoginStatus() {
    try {
        const response = await fetch('/get-session');
        const data = await response.json();
        return data.loggedIn;
    } catch (error) {
        console.error('Error fetching session:', error);
        return false;
    }
}

/**
 * Fetch all ads posted by the current user
 */
async function fetchUserAds() {
    try {
        const response = await fetch('/my-ads');
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const userAds = await response.json();
        
        if (userAds.length === 0) {
            displayNoAdsMessage();
        } else {
            displayUserAds(userAds);
            updateAdStats(userAds);
        }
    } catch (error) {
        console.error('Error fetching user ads:', error);
        displayErrorMessage('Error fetching your ads. Please try again later.');
    }
}

/**
 * Display the user's ads in the grid
 * @param {Array} ads Array of ad objects to display
 */
function displayUserAds(ads) {
    const booksContainer = document.getElementById('my-books-container');
    booksContainer.innerHTML = ''; // Clear existing content
    
    ads.forEach(ad => {
        // Get the first image or use a placeholder
        const imgSrc = ad.images && ad.images.length > 0 
            ? `/${ad.images[0]}` 
            : '/images/placeholder-book.jpg';
        
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        bookCard.dataset.id = ad._id;
        
        bookCard.innerHTML = `
            <div class="book-image">
                <img src="${imgSrc}" alt="${ad.title}">
            </div>
            <div class="book-info">
                <h3 class="book-title">${ad.title}</h3>
                <p class="book-author">${ad.author || 'Unknown Author'}</p>
                <p class="book-price">₹${ad.price}</p>
                <div class="book-stats">
                    <span><i class="bi bi-eye"></i> ${ad.views || 0}</span>
                    <span><i class="bi bi-calendar"></i> ${formatDate(ad.createdAt || new Date())}</span>
                </div>
                <div class="book-actions">
                    <button class="edit-button" onclick="editAd('${ad._id}')">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="delete-button" onclick="deleteAd('${ad._id}')">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
        
        booksContainer.appendChild(bookCard);
    });
}

/**
 * Format a date for display
 * @param {string|Date} dateString Date to format
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

/**
 * Update the ad statistics display
 * @param {Array} ads Array of ad objects
 */
function updateAdStats(ads) {
    // Calculate totals
    const totalAds = ads.length;
    const totalViews = ads.reduce((sum, ad) => sum + (ad.views || 0), 0);
    const totalValue = ads.reduce((sum, ad) => sum + parseFloat(ad.price || 0), 0);
    
    // Update stats display in both locations (there appears to be duplicate elements in HTML)
    const totalAdsElements = document.querySelectorAll('#total-ads');
    const totalViewsElements = document.querySelectorAll('#total-views');
    const totalValueElements = document.querySelectorAll('#total-value');
    
    totalAdsElements.forEach(element => {
        element.textContent = totalAds;
    });
    
    totalViewsElements.forEach(element => {
        element.textContent = totalViews;
    });
    
    totalValueElements.forEach(element => {
        element.textContent = `₹${totalValue.toFixed(2)}`;
    });
}

/**
 * Display a message when user has no ads
 */
function displayNoAdsMessage() {
    const booksContainer = document.getElementById('my-books-container');
    booksContainer.innerHTML = `
        <div class="no-ads-message">
            <i class="bi bi-journal-x"></i>
            <h3>You don't have any ads yet</h3>
            <p>Start selling your books by posting an ad!</p>
            <a href="/post-ad.html" class="post-ad-button">
                <i class="bi bi-plus-circle"></i> Post an Ad
            </a>
        </div>
    `;
    
    // Update stats to zero
    updateAdStats([]);
}

/**
 * Display an error message
 * @param {string} message Error message to display
 */
function displayErrorMessage(message) {
    const booksContainer = document.getElementById('my-books-container');
    booksContainer.innerHTML = `
        <div class="error-message">
            <i class="bi bi-exclamation-triangle"></i>
            <h3>Something went wrong</h3>
            <p>${message}</p>
            <button onclick="fetchUserAds()" class="retry-button">
                <i class="bi bi-arrow-clockwise"></i> Try Again
            </button>
        </div>
    `;
}

/**
 * Navigate to edit page for an ad
 * @param {string} adId ID of the ad to edit
 */
function editAd(adId) {
    window.location.href = `/post-ad.html?edit=${adId}`;
}

/**
 * Delete an ad after confirmation
 * @param {string} adId ID of the ad to delete
 */
function deleteAd(adId) {
    if (confirm('Are you sure you want to delete this ad? This action cannot be undone.')) {
        performDeleteAd(adId);
    }
}

/**
 * Perform the actual deletion of an ad
 * @param {string} adId ID of the ad to delete
 */
async function performDeleteAd(adId) {
    try {
        const response = await fetch(`/api/ads/${adId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        // Remove the deleted ad from the DOM
        const adElement = document.querySelector(`.book-card[data-id="${adId}"]`);
        if (adElement) {
            adElement.remove();
        }
        
        // Check if there are any ads left
        const remainingAds = document.querySelectorAll('.book-card');
        if (remainingAds.length === 0) {
            displayNoAdsMessage();
        } else {
            // Re-fetch all ads to update statistics
            fetchUserAds();
        }
        
        showNotification('Ad deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting ad:', error);
        showNotification('Error deleting ad. Please try again.', 'error');
    }
}

/**
 * Show a notification to the user
 * @param {string} message Message to display
 * @param {string} type Type of notification ('success' or 'error')
 */
function showNotification(message, type = 'success') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
    }
    
    // Set notification content and style
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    // Show notification
    notification.style.display = 'block';
    notification.style.opacity = '1';
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 500);
    }, 3000);
}

// Add real-time notifications for book sales
function setupNotifications() {
    checkLoginStatus()
        .then(isLoggedIn => {
            if (isLoggedIn) {
                // Check for existing notifications
                fetchNotifications();
                
                // Set up event source for real-time notifications
                const eventSource = new EventSource('/notifications/stream');
                
                eventSource.onmessage = function(event) {
                    const notification = JSON.parse(event.data);
                    showBookSoldNotification(notification);
                };
                
                eventSource.onerror = function() {
                    console.error('SSE connection error');
                    eventSource.close();
                    
                    // Try to reconnect after 5 seconds
                    setTimeout(setupNotifications, 5000);
                };
            }
        })
        .catch(error => {
            console.error('Error setting up notifications:', error);
        });
}

/**
 * Fetch existing notifications from the server
 */
async function fetchNotifications() {
    try {
        const response = await fetch('/seller/notifications');
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.notifications.length > 0) {
            data.notifications.forEach(notification => {
                showBookSoldNotification(notification);
            });
        }
    } catch (error) {
        console.error('Error fetching notifications:', error);
    }
}

/**
 * Show a notification when a book is sold
 * @param {Object} notification Notification object
 */
function showBookSoldNotification(notification) {
    showNotification(notification.message, 'success');
    
    // Refresh the ads list to update any changes
    fetchUserAds();
}

// Initialize notifications when the page loads
document.addEventListener('DOMContentLoaded', function() {
    setupNotifications();
});