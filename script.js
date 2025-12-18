// ==================== FIREBASE CONFIGURATION ====================
const firebaseConfig = {
    apiKey: "AIzaSyDm-pq9lsbn5KASjtbeOrdIdyXdc9WgRoQ",
    authDomain: "rds-library.firebaseapp.com",
    databaseURL: "https://rds-library-default-rtdb.firebaseio.com",
    projectId: "rds-library",
    storageBucket: "rds-library.firebasestorage.app",
    messagingSenderId: "1043493423342",
    appId: "1:1043493423342:web:d4675d2a7c35fe21798bff",
    measurementId: "G-7C712Z0WJ9"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
console.log("Firebase initialized for viewer!");

// ==================== GLOBAL VARIABLES ====================
let categories = [];
let pdfs = [];
let currentCategory = 'all';
let currentPdfId = null;
let filteredPdfs = [];
let currentView = 'grid'; // 'grid' or 'list'
let currentPage = 1;
const itemsPerPage = 15; // 3 columns x 5 rows = 15 items per page

// ==================== INITIALIZE VIEWER ====================
function initViewer() {
    console.log("Initializing PDF Viewer...");
    
    // Load data from Firebase
    loadCategories();
    loadPDFs();
    
    // Setup event listeners
    setupEventListeners();
    
    // Show loading state
    document.getElementById('pdfIconGrid').innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <h3>Connecting to Library...</h3>
            <p>Loading PDFs from Firebase database</p>
        </div>
    `;
}

// ==================== LOAD CATEGORIES ====================
function loadCategories() {
    console.log("Loading categories from Firebase...");
    
    database.ref('categories').on('value', (snapshot) => {
        categories = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                categories.push({
                    id: child.key,
                    ...child.val()
                });
            });
            console.log(`Loaded ${categories.length} categories`);
        } else {
            console.log("No categories found in database");
        }
        
        renderCategoriesDropdown();
        updateStats();
    }, (error) => {
        console.error("Error loading categories:", error);
        showError("Failed to load categories. Check Firebase connection.");
    });
}

// ==================== LOAD PDFS ====================
function loadPDFs() {
    console.log("Loading PDFs from Firebase...");
    
    database.ref('pdfs').on('value', (snapshot) => {
        pdfs = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                pdfs.push({
                    id: child.key,
                    ...child.val()
                });
            });
            console.log(`Loaded ${pdfs.length} PDFs`);
        } else {
            console.log("No PDFs found in database");
        }
        
        filterPdfs();
        updateStats();
    }, (error) => {
        console.error("Error loading PDFs:", error);
        showError("Failed to load PDFs. Check Firebase connection.");
    });
}

// ==================== RENDER CATEGORIES DROPDOWN ====================
function renderCategoriesDropdown() {
    const container = document.getElementById('categoriesDropdown');
    const selectedCategoryElement = document.getElementById('selectedCategory');
    
    // Clear container
    container.innerHTML = '<div class="dropdown-item active" data-category="all">All Categories</div>';
    
    // Add each category
    if (categories.length > 0) {
        categories.forEach(category => {
            const catElement = document.createElement('div');
            catElement.className = 'dropdown-item';
            catElement.setAttribute('data-category', category.id);
            catElement.textContent = category.name;
            
            container.appendChild(catElement);
        });
    }
    
    // Update selected category text
    if (currentCategory === 'all') {
        selectedCategoryElement.textContent = 'All Categories';
    } else {
        const selectedCat = categories.find(cat => cat.id === currentCategory);
        selectedCategoryElement.textContent = selectedCat ? selectedCat.name : 'All Categories';
    }
}

// ==================== FILTER PDFS ====================
function filterPdfs() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    let filtered = pdfs;
    
    // Apply category filter
    if (currentCategory !== 'all') {
        filtered = filtered.filter(pdf => 
            pdf.categories && pdf.categories.includes(currentCategory)
        );
    }
    
    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(pdf => {
            // Search in name
            if (pdf.name && pdf.name.toLowerCase().includes(searchTerm)) return true;
            
            // Search in description
            if (pdf.description && pdf.description.toLowerCase().includes(searchTerm)) return true;
            
            // Search in categories
            if (pdf.categories) {
                const pdfCategories = categories.filter(cat => pdf.categories.includes(cat.id));
                return pdfCategories.some(cat => 
                    cat.name && cat.name.toLowerCase().includes(searchTerm)
                );
            }
            
            return false;
        });
    }
    
    filteredPdfs = filtered;
    currentPage = 1; // Reset to first page when filtering
    renderViewerContent();
    renderPagination();
}

// ==================== RENDER VIEWER CONTENT ====================
function renderViewerContent() {
    if (currentView === 'grid') {
        renderIconGrid();
    } else {
        renderListView();
    }
}

// ==================== RENDER ICON GRID ====================
function renderIconGrid() {
    const container = document.getElementById('pdfIconGrid');
    const listContainer = document.getElementById('pdfListView');
    
    // Hide list view, show grid view
    listContainer.style.display = 'none';
    container.style.display = 'grid';
    
    if (filteredPdfs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-pdf"></i>
                <h3>No PDFs Found</h3>
                <p>${pdfs.length === 0 ? 'No PDFs in the library yet. Check back later!' : 'Try a different category or search term'}</p>
            </div>
        `;
        return;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredPdfs.length);
    const pagePdfs = filteredPdfs.slice(startIndex, endIndex);
    
    let html = '';
    pagePdfs.forEach(pdf => {
        // Get category names for this PDF
        const pdfCategories = categories.filter(cat => 
            pdf.categories && pdf.categories.includes(cat.id)
        );
        
        // Get primary category for display
        const primaryCategory = pdfCategories.length > 0 ? pdfCategories[0].name : 'Uncategorized';
        
        // Truncate name if too long
        const displayName = pdf.name.length > 25 
            ? pdf.name.substring(0, 25) + '...' 
            : pdf.name;
        
        html += `
        <div class="pdf-icon-item" onclick="viewPdf('${pdf.id}')">
            <div class="download-count">
                <i class="fas fa-download"></i> ${pdf.downloads || 0}
            </div>
            <div class="file-type ${pdf.type === 'drive' ? 'drive' : ''}">
                <i class="${pdf.type === 'drive' ? 'fab fa-google-drive' : 'fas fa-file-upload'}"></i>
            </div>
            <i class="fas fa-file-pdf"></i>
            <h4>${displayName}</h4>
            <div class="file-size">${pdf.size || 'N/A'}</div>
            <div class="category-tag" title="${primaryCategory}">${primaryCategory}</div>
        </div>
        `;
    });
    
    container.innerHTML = html;
}

// ==================== RENDER LIST VIEW ====================
function renderListView() {
    const container = document.getElementById('pdfListView');
    const gridContainer = document.getElementById('pdfIconGrid');
    
    // Hide grid view, show list view
    gridContainer.style.display = 'none';
    container.style.display = 'block';
    
    if (filteredPdfs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-pdf"></i>
                <h3>No PDFs Found</h3>
                <p>${pdfs.length === 0 ? 'No PDFs in the library yet. Check back later!' : 'Try a different category or search term'}</p>
            </div>
        `;
        return;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredPdfs.length);
    const pagePdfs = filteredPdfs.slice(startIndex, endIndex);
    
    let html = '';
    pagePdfs.forEach(pdf => {
        // Get category names for this PDF
        const pdfCategories = categories.filter(cat => 
            pdf.categories && pdf.categories.includes(cat.id)
        );
        
        // Format date
        let formattedDate = 'N/A';
        if (pdf.uploadDate) {
            try {
                formattedDate = new Date(pdf.uploadDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            } catch (e) {
                formattedDate = pdf.uploadDate;
            }
        }
        
        html += `
        <div class="pdf-list-item">
            <div class="list-icon">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="list-content">
                <h4>${pdf.name || 'Unnamed PDF'}</h4>
                <p>${pdf.description || 'No description available'}</p>
                <div class="list-meta">
                    <span><i class="fas fa-hdd"></i> ${pdf.size || 'N/A'}</span>
                    <span><i class="fas fa-calendar"></i> ${formattedDate}</span>
                    <span><i class="fas fa-download"></i> ${pdf.downloads || 0} downloads</span>
                    <span><i class="${pdf.type === 'drive' ? 'fab fa-google-drive' : 'fas fa-file-upload'}"></i> ${pdf.type === 'drive' ? 'Google Drive' : 'Direct Upload'}</span>
                </div>
            </div>
            <div class="list-actions">
                <button class="btn btn-primary" onclick="viewPdf('${pdf.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-success" onclick="downloadPdf('${pdf.id}')">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        </div>
        `;
    });
    
    container.innerHTML = html;
}

// ==================== RENDER PAGINATION ====================
function renderPagination() {
    const pagination = document.getElementById('pagination');
    const pageNumbers = document.getElementById('pageNumbers');
    
    if (filteredPdfs.length <= itemsPerPage) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    const totalPages = Math.ceil(filteredPdfs.length / itemsPerPage);
    
    // Clear page numbers
    pageNumbers.innerHTML = '';
    
    // Add page numbers
    for (let i = 1; i <= totalPages; i++) {
        const pageNumber = document.createElement('div');
        pageNumber.className = `page-number ${i === currentPage ? 'active' : ''}`;
        pageNumber.textContent = i;
        pageNumber.addEventListener('click', () => {
            currentPage = i;
            renderViewerContent();
            renderPagination();
        });
        
        pageNumbers.appendChild(pageNumber);
    }
    
    // Update button states
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;
}

// ==================== VIEW PDF ====================
window.viewPdf = function(id) {
    const pdf = pdfs.find(p => p.id === id);
    if (!pdf) {
        alert('PDF not found');
        return;
    }
    
    currentPdfId = id;
    document.getElementById('modalPdfTitle').textContent = pdf.name || 'PDF Document';
    document.getElementById('viewingPdfName').textContent = pdf.name || 'PDF Document';
    
    const message = document.getElementById('pdfViewerMessage');
    const driveContainer = document.getElementById('driveEmbedContainer');
    const driveLink = document.getElementById('driveViewLink');
    
    if (pdf.type === 'drive' && pdf.driveLink) {
        message.textContent = pdf.description || "This PDF is hosted on Google Drive.";
        driveContainer.style.display = 'block';
        driveLink.href = pdf.driveLink;
        driveLink.innerHTML = `<i class="fab fa-google-drive"></i> View on Google Drive`;
    } else if (pdf.fileURL) {
        message.textContent = pdf.description || "This PDF is available for download.";
        driveContainer.style.display = 'block';
        driveLink.href = pdf.fileURL;
        driveLink.innerHTML = `<i class="fas fa-external-link-alt"></i> Open PDF`;
    } else {
        message.textContent = pdf.description || "PDF document preview.";
        driveContainer.style.display = 'none';
    }
    
    document.getElementById('pdfViewerModal').classList.add('active');
};

// ==================== DOWNLOAD PDF ====================
window.downloadPdf = async function(id) {
    const pdf = pdfs.find(p => p.id === id);
    if (!pdf) {
        alert('PDF not found');
        return;
    }
    
    try {
        // Increment download count in database
        const newDownloads = (pdf.downloads || 0) + 1;
        await database.ref('pdfs/' + id).update({ 
            downloads: newDownloads,
            lastDownloaded: new Date().toISOString()
        });
        
        // Open the PDF
        if (pdf.type === 'drive' && pdf.driveLink) {
            // For Google Drive links, open in new tab
            window.open(pdf.driveLink, '_blank');
            alert(`Opening "${pdf.name}" from Google Drive...`);
        } else if (pdf.fileURL) {
            // For uploaded files, open the URL
            window.open(pdf.fileURL, '_blank');
            alert(`Downloading "${pdf.name}"...`);
        } else {
            alert(`PDF: ${pdf.name}\n\nIn a real application, this would download the PDF file.`);
        }
        
        // Update local data
        pdf.downloads = newDownloads;
        updateStats();
        filterPdfs();
        
    } catch (error) {
        console.error('Error downloading PDF:', error);
        alert('Failed to download PDF. Please try again.');
    }
};

// ==================== UPDATE STATISTICS ====================
function updateStats() {
    document.getElementById('totalPdfs').textContent = pdfs.length;
    document.getElementById('totalCategories').textContent = categories.length;
    
    let totalDownloads = 0;
    pdfs.forEach(pdf => {
        totalDownloads += pdf.downloads || 0;
    });
    
    document.getElementById('totalDownloads').textContent = totalDownloads;
}

// ==================== SHOW ERROR ====================
function showError(message) {
    const container = document.getElementById('pdfIconGrid');
    container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle" style="color: #ff6b6b;"></i>
            <h3>Connection Error</h3>
            <p>${message}</p>
            <button onclick="initViewer()" class="btn btn-primary" style="margin-top: 20px;">
                <i class="fas fa-redo"></i> Retry Connection
            </button>
        </div>
    `;
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', filterPdfs);
    
    // Clear search on escape
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            filterPdfs();
        }
    });
    
    // Categories dropdown
    const dropdownHeader = document.getElementById('dropdownHeader');
    const dropdownContent = document.getElementById('categoriesDropdown');
    const dropdownArrow = document.getElementById('dropdownArrow');
    
    dropdownHeader.addEventListener('click', () => {
        dropdownContent.classList.toggle('active');
        dropdownArrow.style.transform = dropdownContent.classList.contains('active') 
            ? 'rotate(180deg)' 
            : 'rotate(0deg)';
    });
    
    // Handle category selection
    dropdownContent.addEventListener('click', (e) => {
        if (e.target.classList.contains('dropdown-item')) {
            const category = e.target.getAttribute('data-category');
            currentCategory = category;
            
            // Update selected category text
            if (category === 'all') {
                document.getElementById('selectedCategory').textContent = 'All Categories';
            } else {
                const selectedCat = categories.find(cat => cat.id === category);
                document.getElementById('selectedCategory').textContent = selectedCat ? selectedCat.name : 'All Categories';
            }
            
            // Update active class
            document.querySelectorAll('.dropdown-item').forEach(item => {
                item.classList.remove('active');
            });
            e.target.classList.add('active');
            
            // Close dropdown
            dropdownContent.classList.remove('active');
            dropdownArrow.style.transform = 'rotate(0deg)';
            
            // Filter PDFs
            filterPdfs();
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdownHeader.contains(e.target) && !dropdownContent.contains(e.target)) {
            dropdownContent.classList.remove('active');
            dropdownArrow.style.transform = 'rotate(0deg)';
        }
    });
    
    // View toggle buttons
    document.getElementById('gridViewBtn').addEventListener('click', () => {
        if (currentView !== 'grid') {
            currentView = 'grid';
            document.getElementById('gridViewBtn').classList.add('active');
            document.getElementById('listViewBtn').classList.remove('active');
            renderViewerContent();
        }
    });
    
    document.getElementById('listViewBtn').addEventListener('click', () => {
        if (currentView !== 'list') {
            currentView = 'list';
            document.getElementById('listViewBtn').classList.add('active');
            document.getElementById('gridViewBtn').classList.remove('active');
            renderViewerContent();
        }
    });
    
    // Pagination buttons
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderViewerContent();
            renderPagination();
        }
    });
    
    document.getElementById('nextBtn').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredPdfs.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderViewerContent();
            renderPagination();
        }
    });
    
    // Modal close button
    document.getElementById('closeViewerModal').addEventListener('click', () => {
        document.getElementById('pdfViewerModal').classList.remove('active');
    });
    
    // Download button in modal
    document.getElementById('downloadPdfBtn').addEventListener('click', () => {
        if (currentPdfId) {
            downloadPdf(currentPdfId);
            document.getElementById('pdfViewerModal').classList.remove('active');
        }
    });
    
    // Print button in modal
    document.getElementById('printPdfBtn').addEventListener('click', () => {
        alert('Print functionality would open print dialog for the PDF.');
    });
    
    // Close modal when clicking outside
    document.getElementById('pdfViewerModal').addEventListener('click', (e) => {
        if (e.target.id === 'pdfViewerModal') {
            document.getElementById('pdfViewerModal').classList.remove('active');
        }
    });
}

// ==================== INITIALIZE ON LOAD ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log("PDF Viewer DOM loaded");
    
    // Check Firebase connection
    if (typeof firebase === 'undefined') {
        showError("Firebase SDK failed to load. Check your internet connection.");
        return;
    }
    
    if (!firebase.apps.length) {
        showError("Firebase not initialized. Please refresh the page.");
        return;
    }
    
    // Initialize the viewer
    initViewer();
});

// ==================== SAMPLE DATA GENERATOR ====================
window.addSamplePDFs = async function() {
    const samplePDFs = [
        {
            name: "Introduction to Web Development",
            description: "A beginner's guide to HTML, CSS, and JavaScript for web development.",
            categories: [],
            type: "drive",
            driveLink: "https://drive.google.com/file/d/sample1/view",
            size: "2.5 MB",
            uploadDate: new Date().toISOString().split('T')[0],
            downloads: 15
        },
        {
            name: "Business Analytics Fundamentals",
            description: "Learn the basics of business analytics and data-driven decision making.",
            categories: [],
            type: "drive",
            driveLink: "https://drive.google.com/file/d/sample2/view",
            size: "3.1 MB",
            uploadDate: "2023-11-15",
            downloads: 28
        },
        {
            name: "Machine Learning Concepts",
            description: "Introduction to machine learning algorithms and their applications.",
            categories: [],
            type: "file",
            fileURL: "https://example.com/sample.pdf",
            size: "4.2 MB",
            uploadDate: "2023-11-10",
            downloads: 42
        }
    ];
    
    try {
        // First create sample categories if none exist
        if (categories.length === 0) {
            const sampleCategories = [
                { name: "Technology", color: "technology" },
                { name: "Business", color: "business" },
                { name: "Education", color: "academic" },
                { name: "Science", color: "science" },
                { name: "History", color: "history" }
            ];
            
            for (const cat of sampleCategories) {
                await database.ref('categories').push().set(cat);
            }
            console.log("Added sample categories");
        }
        
        // Wait a moment for categories to load
        setTimeout(async () => {
            // Get category IDs
            const catIds = categories.map(cat => cat.id);
            
            // Add sample PDFs with categories
            for (const pdf of samplePDFs) {
                const pdfCopy = { ...pdf };
                pdfCopy.categories = [catIds[0], catIds[1]]; // Assign first 2 categories
                await database.ref('pdfs').push().set(pdfCopy);
            }
            
            console.log("Added sample PDFs");
            alert("Sample data added successfully!");
        }, 1000);
        
    } catch (error) {
        console.error("Error adding sample data:", error);
        alert("Failed to add sample data: " + error.message);
    }
};
