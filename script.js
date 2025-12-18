// Firebase Configuration
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
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized!");
} catch (error) {
    console.error("Firebase error:", error);
}

const database = firebase.database();

// Global variables
let categories = [];
let pdfs = [];
let filteredPdfs = [];
let currentCategory = 'all';
let currentPage = 1;
const itemsPerPage = 15;

// When page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("Page loaded!");
    
    // Load data
    loadCategories();
    loadPDFs();
    
    // Setup events
    setupEvents();
    
    // Set default view to grid
    setView('grid');
});

// Load categories from Firebase
function loadCategories() {
    console.log("Loading categories...");
    
    database.ref('categories').on('value', (snapshot) => {
        categories = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                categories.push({
                    id: child.key,
                    ...child.val()
                });
            });
            console.log("Categories loaded:", categories.length);
            updateCategoryDropdown();
        }
        
        updateStats();
    });
}

// Load PDFs from Firebase
function loadPDFs() {
    console.log("Loading PDFs...");
    
    database.ref('pdfs').on('value', (snapshot) => {
        pdfs = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                pdfs.push({
                    id: child.key,
                    ...child.val()
                });
            });
            console.log("PDFs loaded:", pdfs.length);
        }
        
        filterPdfs();
        updateStats();
    });
}

// Update category dropdown
function updateCategoryDropdown() {
    const dropdown = document.getElementById('categoriesDropdown');
    if (!dropdown) return;
    
    dropdown.innerHTML = '<div class="dropdown-item active" data-category="all">All Categories</div>';
    
    categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.setAttribute('data-category', cat.id);
        item.textContent = cat.name;
        dropdown.appendChild(item);
    });
}

// Filter PDFs based on search and category
function filterPdfs() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    filteredPdfs = [...pdfs];
    
    // Filter by category
    if (currentCategory !== 'all') {
        filteredPdfs = filteredPdfs.filter(pdf => 
            pdf.categories && pdf.categories.includes(currentCategory)
        );
    }
    
    // Filter by search term
    if (searchTerm) {
        filteredPdfs = filteredPdfs.filter(pdf => {
            const nameMatch = pdf.name && pdf.name.toLowerCase().includes(searchTerm);
            const descMatch = pdf.description && pdf.description.toLowerCase().includes(searchTerm);
            return nameMatch || descMatch;
        });
    }
    
    renderContent();
    updatePagination();
}

// Render content based on current view
function renderContent() {
    const gridContainer = document.getElementById('pdfIconGrid');
    const listContainer = document.getElementById('pdfListView');
    
    if (!gridContainer || !listContainer) return;
    
    // Get items for current page
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredPdfs.length);
    const pageItems = filteredPdfs.slice(startIndex, endIndex);
    
    if (pageItems.length === 0) {
        const emptyHTML = `
            <div class="empty-state">
                <i class="fas fa-file-pdf"></i>
                <h3>No PDFs Found</h3>
                <p>${pdfs.length === 0 ? 'No PDFs in library' : 'Try different search or category'}</p>
            </div>
        `;
        
        gridContainer.innerHTML = emptyHTML;
        listContainer.innerHTML = emptyHTML;
        return;
    }
    
    // Render grid view
    let gridHTML = '';
    pageItems.forEach(pdf => {
        const catName = getCategoryName(pdf);
        
        gridHTML += `
        <div class="pdf-icon-item" onclick="showPDF('${pdf.id}')">
            <div class="download-count">
                <i class="fas fa-download"></i> ${pdf.downloads || 0}
            </div>
            <div class="file-type ${pdf.type === 'drive' ? 'drive' : ''}">
                <i class="${pdf.type === 'drive' ? 'fab fa-google-drive' : 'fas fa-file-upload'}"></i>
            </div>
            <i class="fas fa-file-pdf"></i>
            <h4>${pdf.name || 'Unnamed PDF'}</h4>
            <div class="file-size">${pdf.size || 'N/A'}</div>
            <div class="category-tag">${catName}</div>
        </div>
        `;
    });
    gridContainer.innerHTML = gridHTML;
    
    // Render list view
    let listHTML = '';
    pageItems.forEach(pdf => {
        const catName = getCategoryName(pdf);
        const date = pdf.uploadDate ? new Date(pdf.uploadDate).toLocaleDateString() : 'N/A';
        
        listHTML += `
        <div class="pdf-list-item">
            <div class="list-icon">
                <i class="fas fa-file-pdf"></i>
            </div>
            <div class="list-content">
                <h4>${pdf.name || 'Unnamed PDF'}</h4>
                <p>${pdf.description || 'No description available'}</p>
                <div class="list-meta">
                    <span><i class="fas fa-hdd"></i> ${pdf.size || 'N/A'}</span>
                    <span><i class="fas fa-calendar"></i> ${date}</span>
                    <span><i class="fas fa-download"></i> ${pdf.downloads || 0} downloads</span>
                    <span><i class="${pdf.type === 'drive' ? 'fab fa-google-drive' : 'fas fa-file-upload'}"></i> ${pdf.type === 'drive' ? 'Google Drive' : 'Direct'}</span>
                </div>
            </div>
            <div class="list-actions">
                <button class="btn btn-primary" onclick="showPDF('${pdf.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-success" onclick="downloadPDF('${pdf.id}')">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        </div>
        `;
    });
    listContainer.innerHTML = listHTML;
}

// Get category name for a PDF
function getCategoryName(pdf) {
    if (!pdf.categories || pdf.categories.length === 0) return 'Uncategorized';
    
    const firstCatId = pdf.categories[0];
    const category = categories.find(cat => cat.id === firstCatId);
    return category ? category.name : 'Uncategorized';
}

// Update pagination
function updatePagination() {
    const pagination = document.getElementById('pagination');
    const pageNumbers = document.getElementById('pageNumbers');
    
    if (!pagination || !pageNumbers) return;
    
    if (filteredPdfs.length <= itemsPerPage) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    const totalPages = Math.ceil(filteredPdfs.length / itemsPerPage);
    
    pageNumbers.innerHTML = '';
    
    for (let i = 1; i <= totalPages; i++) {
        const page = document.createElement('div');
        page.className = `page-number ${i === currentPage ? 'active' : ''}`;
        page.textContent = i;
        page.onclick = () => {
            currentPage = i;
            renderContent();
            updatePagination();
        };
        pageNumbers.appendChild(page);
    }
    
    // Update button states
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages;
}

// Set view type (grid or list)
function setView(viewType) {
    currentPage = 1;
    
    const gridBtn = document.getElementById('gridViewBtn');
    const listBtn = document.getElementById('listViewBtn');
    const gridView = document.getElementById('pdfIconGrid');
    const listView = document.getElementById('pdfListView');
    
    if (viewType === 'grid') {
        currentView = 'grid';
        gridBtn.classList.add('active');
        listBtn.classList.remove('active');
        gridView.style.display = 'grid';
        listView.style.display = 'none';
    } else {
        currentView = 'list';
        listBtn.classList.add('active');
        gridBtn.classList.remove('active');
        gridView.style.display = 'none';
        listView.style.display = 'block';
    }
    
    renderContent();
    updatePagination();
}

// Show PDF in modal
function showPDF(pdfId) {
    const pdf = pdfs.find(p => p.id === pdfId);
    if (!pdf) {
        alert('PDF not found');
        return;
    }
    
    // Update modal content
    document.getElementById('modalPdfTitle').textContent = pdf.name || 'PDF Document';
    document.getElementById('viewingPdfName').textContent = pdf.name || 'PDF Document';
    document.getElementById('pdfViewerMessage').textContent = pdf.description || 'No description available';
    
    // Set download button
    const downloadBtn = document.getElementById('downloadPdfBtn');
    downloadBtn.onclick = () => downloadPDF(pdfId);
    
    // Set Google Drive link
    const driveLink = document.getElementById('driveViewLink');
    const driveContainer = document.getElementById('driveEmbedContainer');
    
    if (pdf.type === 'drive' && pdf.driveLink) {
        driveLink.href = pdf.driveLink;
        driveLink.innerHTML = '<i class="fab fa-google-drive"></i> View on Google Drive';
        driveContainer.style.display = 'block';
    } else if (pdf.fileURL) {
        driveLink.href = pdf.fileURL;
        driveLink.innerHTML = '<i class="fas fa-external-link-alt"></i> Open PDF';
        driveContainer.style.display = 'block';
    } else {
        driveContainer.style.display = 'none';
    }
    
    // Show modal
    document.getElementById('pdfViewerModal').classList.add('active');
}

// Download PDF
async function downloadPDF(pdfId) {
    const pdf = pdfs.find(p => p.id === pdfId);
    if (!pdf) {
        alert('PDF not found');
        return;
    }
    
    try {
        // Update download count
        const newDownloads = (pdf.downloads || 0) + 1;
        await database.ref('pdfs/' + pdfId).update({ 
            downloads: newDownloads 
        });
        
        // Open PDF
        if (pdf.driveLink) {
            window.open(pdf.driveLink, '_blank');
        } else if (pdf.fileURL) {
            window.open(pdf.fileURL, '_blank');
        } else {
            alert(`PDF: ${pdf.name}\nLink not available`);
        }
        
        // Update local data
        pdf.downloads = newDownloads;
        updateStats();
        filterPdfs();
        
    } catch (error) {
        alert('Download failed');
    }
}

// Update statistics
function updateStats() {
    document.getElementById('totalPdfs').textContent = pdfs.length;
    document.getElementById('totalCategories').textContent = categories.length;
    
    let totalDownloads = 0;
    pdfs.forEach(pdf => {
        totalDownloads += pdf.downloads || 0;
    });
    document.getElementById('totalDownloads').textContent = totalDownloads;
}

// Setup all event listeners
function setupEvents() {
    console.log("Setting up events...");
    
    // Search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', () => {
        currentPage = 1;
        filterPdfs();
    });
    
    // Category dropdown
    const dropdownHeader = document.getElementById('dropdownHeader');
    const dropdown = document.getElementById('categoriesDropdown');
    const dropdownArrow = document.getElementById('dropdownArrow');
    
    dropdownHeader.addEventListener('click', () => {
        dropdown.classList.toggle('active');
        dropdownArrow.style.transform = dropdown.classList.contains('active') 
            ? 'rotate(180deg)' 
            : 'rotate(0deg)';
    });
    
    dropdown.addEventListener('click', (e) => {
        if (e.target.classList.contains('dropdown-item')) {
            const category = e.target.getAttribute('data-category');
            
            // Update UI
            document.querySelectorAll('.dropdown-item').forEach(item => {
                item.classList.remove('active');
            });
            e.target.classList.add('active');
            
            // Update text
            const selectedText = document.getElementById('selectedCategory');
            if (category === 'all') {
                selectedText.textContent = 'All Categories';
            } else {
                const cat = categories.find(c => c.id === category);
                selectedText.textContent = cat ? cat.name : 'All Categories';
            }
            
            // Update filter
            currentCategory = category;
            currentPage = 1;
            filterPdfs();
            
            // Close dropdown
            dropdown.classList.remove('active');
            dropdownArrow.style.transform = 'rotate(0deg)';
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdownHeader.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
            dropdownArrow.style.transform = 'rotate(0deg)';
        }
    });
    
    // View buttons
    document.getElementById('gridViewBtn').addEventListener('click', () => setView('grid'));
    document.getElementById('listViewBtn').addEventListener('click', () => setView('list'));
    
    // Pagination buttons
    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderContent();
            updatePagination();
        }
    });
    
    document.getElementById('nextBtn').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredPdfs.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderContent();
            updatePagination();
        }
    });
    
    // Modal close
    document.getElementById('closeViewerModal').addEventListener('click', () => {
        document.getElementById('pdfViewerModal').classList.remove('active');
    });
    
    // Close modal when clicking outside
    document.getElementById('pdfViewerModal').addEventListener('click', (e) => {
        if (e.target.id === 'pdfViewerModal') {
            document.getElementById('pdfViewerModal').classList.remove('active');
        }
    });
    
    // Print button
    document.getElementById('printPdfBtn').addEventListener('click', () => {
        alert('Print feature will be added soon');
    });
}

// Make functions global
window.showPDF = showPDF;
window.downloadPDF = downloadPDF;
window.setView = setView;

// Add sample data function
window.addSampleData = function() {
    const categoriesData = {
        "cat1": { name: "Technology", color: "blue" },
        "cat2": { name: "Business", color: "green" },
        "cat3": { name: "Education", color: "orange" }
    };
    
    const pdfsData = {
        "pdf1": {
            name: "Web Development Guide",
            description: "Complete guide to modern web development",
            categories: ["cat1", "cat3"],
            type: "drive",
            driveLink: "https://drive.google.com/file/d/1ABC123DEF456/view",
            size: "2.5 MB",
            uploadDate: "2023-12-01",
            downloads: 25
        },
        "pdf2": {
            name: "Business Plan Template",
            description: "Professional business plan templates",
            categories: ["cat2"],
            type: "file",
            fileURL: "https://example.com/business-plan.pdf",
            size: "1.8 MB",
            uploadDate: "2023-11-15",
            downloads: 18
        }
    };
    
    database.ref('categories').set(categoriesData)
        .then(() => database.ref('pdfs').set(pdfsData))
        .then(() => alert("Sample data added!"))
        .catch(error => alert("Error: " + error.message));
};

console.log("Script loaded!");
