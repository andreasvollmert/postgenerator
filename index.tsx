// @ts-ignore
import { GoogleGenerativeAI } from '@google/generative-ai';
// @ts-ignore
import { createClient } from '@supabase/supabase-js';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import { fabric } from 'fabric';
// @ts-ignore
import DOMPurify from 'dompurify';
// @ts-ignore
import TurndownService from 'turndown';

// --- KONFIGURATION FÜR API-WECHSEL --- //
const USE_OPENROUTER = process.env.USE_OPENROUTER === 'true';
const ENABLE_VIDEO_GENERATION = process.env.ENABLE_VIDEO_GENERATION === 'true';
const ENABLE_WORDPRESS_EXPORT = process.env.ENABLE_WORDPRESS_EXPORT === 'true';

// --- ERWEITERTE INTERFACES --- //
interface AIClient {
  generateContent(prompt: string, options?: any): Promise<any>;
}

interface MediaGenerationClient {
  generateImage(prompt: string, style?: string): Promise<string>;
  generateVideo(prompt: string, duration?: number): Promise<string>;
  generateThumbnail(title: string, style?: string): Promise<string>;
}

interface WordPressClient {
  createPost(post: WordPressPost): Promise<any>;
  uploadMedia(file: Blob, filename: string): Promise<any>;
  getCategories(): Promise<any[]>;
  getTags(): Promise<any[]>;
}

// --- ERWEITERTE TYPEN --- //
type Post = {
    id: string;
    inputs: Record<string, any>;
    title: string;
    htmlContent: string;
    metaTitle: string;
    metaDescription: string;
    permalink: string;
    image: {
        base64: string;
        prompt: string;
        style: string;
        alt: string;
    } | null;
    video?: {
        url: string;
        prompt: string;
        duration: number;
    } | null;
    thumbnail?: {
        base64: string;
        style: string;
    } | null;
    schema: Record<string, any> | null;
    seoAnalysis?: SEOAnalysis;
    wordpressId?: number;
    createdAt: string;
    updatedAt: string;
};

type Template = {
    id: string;
    name: string;
    description: string;
    category: string;
    settings: Record<string, any>;
    htmlTemplate: string;
    previewImage?: string;
    createdAt: string;
};

type WordPressPost = {
    title: string;
    content: string;
    status: 'draft' | 'publish';
    categories?: number[];
    tags?: number[];
    featured_media?: number;
    meta?: Record<string, any>;
};

// --- SUPABASE DATABASE TYPES --- //
type Database = {
    public: {
        Tables: {
            posts: {
                Row: {
                    id: string;
                    created_at: string;
                    updated_at: string;
                    title: string;
                    content: string;
                    html_content: string;
                    meta_title: string | null;
                    meta_description: string | null;
                    permalink: string | null;
                    inputs: Record<string, any> | null;
                    schema: Record<string, any> | null;
                    image_url: string | null;
                    user_id: string | null;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    title: string;
                    content: string;
                    html_content: string;
                    meta_title?: string | null;
                    meta_description?: string | null;
                    permalink?: string | null;
                    inputs?: Record<string, any> | null;
                    schema?: Record<string, any> | null;
                    image_url?: string | null;
                    user_id?: string | null;
                };
                Update: {
                    id?: string;
                    created_at?: string;
                    updated_at?: string;
                    title?: string;
                    content?: string;
                    html_content?: string;
                    meta_title?: string | null;
                    meta_description?: string | null;
                    permalink?: string | null;
                    inputs?: Record<string, any> | null;
                    schema?: Record<string, any> | null;
                    image_url?: string | null;
                    user_id?: string | null;
                };
            };
        };
    };
};

type SEOAnalysis = {
    score: number;
    keywords: string[];
    readability: string;
};

// --- NANO BANANA GEMINI CLIENT FÜR BILDGENERIERUNG --- //
class NanoBananaClient implements MediaGenerationClient {
    private apiKey: string;
    private baseURL: string = 'https://api.nanobana.com/v1';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async generateImage(prompt: string, style: string = 'realistic'): Promise<string> {
        try {
            const response = await fetch(`${this.baseURL}/generate/image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    style: style,
                    width: 1024,
                    height: 1024,
                    steps: 30,
                    guidance_scale: 7.5
                })
            });

            if (!response.ok) {
                throw new Error(`Nano Banana API Error: ${response.status}`);
            }

            const data = await response.json();
            return data.image_url || data.images[0];
        } catch (error) {
            console.error('Nano Banana Bildgenerierung fehlgeschlagen:', error);
            throw error;
        }
    }

    async generateVideo(prompt: string, duration: number = 5): Promise<string> {
        if (!ENABLE_VIDEO_GENERATION) {
            throw new Error('Video-Generierung ist deaktiviert');
        }

        try {
            const response = await fetch(`${this.baseURL}/generate/video`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    duration: duration,
                    fps: 24,
                    width: 1280,
                    height: 720
                })
            });

            if (!response.ok) {
                throw new Error(`Video-Generierung fehlgeschlagen: ${response.status}`);
            }

            const data = await response.json();
            return data.video_url;
        } catch (error) {
            console.error('Video-Generierung fehlgeschlagen:', error);
            throw error;
        }
    }

    async generateThumbnail(title: string, style: string = 'youtube'): Promise<string> {
        const thumbnailPrompt = `Create a compelling ${style} thumbnail for: "${title}". Bold text, eye-catching colors, professional design.`;
        return this.generateImage(thumbnailPrompt, 'digital-art');
    }
}

// --- WORDPRESS CLIENT --- //
class WordPressIntegration implements WordPressClient {
    private apiUrl: string;
    private username: string;
    private appPassword: string;

    constructor(apiUrl: string, username: string, appPassword: string) {
        this.apiUrl = apiUrl;
        this.username = username;
        this.appPassword = appPassword;
    }

    private getAuthHeaders() {
        const credentials = btoa(`${this.username}:${this.appPassword}`);
        return {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
        };
    }

    async createPost(post: WordPressPost): Promise<any> {
        if (!ENABLE_WORDPRESS_EXPORT) {
            throw new Error('WordPress-Export ist deaktiviert');
        }

        try {
            const response = await fetch(`${this.apiUrl}/posts`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(post)
            });

            if (!response.ok) {
                throw new Error(`WordPress API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('WordPress Post-Erstellung fehlgeschlagen:', error);
            throw error;
        }
    }

    async uploadMedia(file: Blob, filename: string): Promise<any> {
        try {
            const formData = new FormData();
            formData.append('file', file, filename);

            const response = await fetch(`${this.apiUrl}/media`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${btoa(`${this.username}:${this.appPassword}`)}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Media Upload Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Media-Upload fehlgeschlagen:', error);
            throw error;
        }
    }

    async getCategories(): Promise<any[]> {
        try {
            const response = await fetch(`${this.apiUrl}/categories`, {
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Kategorien laden fehlgeschlagen:', error);
            return [];
        }
    }

    async getTags(): Promise<any[]> {
        try {
            const response = await fetch(`${this.apiUrl}/tags`, {
                headers: this.getAuthHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error('Tags laden fehlgeschlagen:', error);
            return [];
        }
    }

    convertToGutenberg(htmlContent: string): string {
        // Konvertiert HTML zu Gutenberg-Blöcken
        const turndownService = new TurndownService();
        const markdown = turndownService.turndown(htmlContent);
        
        // Konvertiert Markdown zu Gutenberg-Blöcken
        return this.markdownToGutenberg(markdown);
    }

    private markdownToGutenberg(markdown: string): string {
        let gutenberg = '';
        const lines = markdown.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('# ')) {
                gutenberg += `<!-- wp:heading {"level":1} -->\n<h1>${line.substring(2)}</h1>\n<!-- /wp:heading -->\n\n`;
            } else if (line.startsWith('## ')) {
                gutenberg += `<!-- wp:heading -->\n<h2>${line.substring(3)}</h2>\n<!-- /wp:heading -->\n\n`;
            } else if (line.startsWith('### ')) {
                gutenberg += `<!-- wp:heading {"level":3} -->\n<h3>${line.substring(4)}</h3>\n<!-- /wp:heading -->\n\n`;
            } else if (line.trim() !== '') {
                gutenberg += `<!-- wp:paragraph -->\n<p>${line}</p>\n<!-- /wp:paragraph -->\n\n`;
            }
        }
        
        return gutenberg;
    }
}

// --- TEMPLATE MANAGER --- //
class TemplateManager {
    private templates: Template[] = [];
    private storageKey = 'ai-content-templates';

    constructor() {
        this.loadTemplates();
        this.initializeDefaultTemplates();
    }

    private loadTemplates() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.templates = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Template laden fehlgeschlagen:', error);
        }
    }

    private saveTemplates() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.templates));
        } catch (error) {
            console.error('Template speichern fehlgeschlagen:', error);
        }
    }

    private initializeDefaultTemplates() {
        if (this.templates.length === 0) {
            this.templates = [
                {
                    id: 'blog-post-standard',
                    name: 'Standard Blog Post',
                    description: 'Klassischer Blog-Post mit Einleitung, Hauptteil und Fazit',
                    category: 'Blog',
                    settings: {
                        includeIntro: true,
                        includeConclusion: true,
                        headingStyle: 'h2',
                        wordCount: 1500
                    },
                    htmlTemplate: `
                        <article class="blog-post">
                            <header>
                                <h1>{{title}}</h1>
                                <div class="meta">{{date}} | {{author}}</div>
                            </header>
                            <div class="content">
                                {{content}}
                            </div>
                            <footer>
                                <div class="tags">{{tags}}</div>
                            </footer>
                        </article>
                    `,
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'product-review',
                    name: 'Produkt-Review',
                    description: 'Template für Produktbewertungen mit Pros/Cons',
                    category: 'Review',
                    settings: {
                        includeRating: true,
                        includeProsAndCons: true,
                        includeSpecs: true
                    },
                    htmlTemplate: `
                        <article class="product-review">
                            <h1>{{title}}</h1>
                            <div class="rating">{{rating}}</div>
                            <div class="pros-cons">
                                <div class="pros">{{pros}}</div>
                                <div class="cons">{{cons}}</div>
                            </div>
                            <div class="content">{{content}}</div>
                        </article>
                    `,
                    createdAt: new Date().toISOString()
                }
            ];
            this.saveTemplates();
        }
    }

    getTemplates(): Template[] {
        return this.templates;
    }

    getTemplate(id: string): Template | null {
        return this.templates.find(t => t.id === id) || null;
    }

    saveTemplate(template: Omit<Template, 'id' | 'createdAt'>): Template {
        const newTemplate: Template = {
            ...template,
            id: `template-${Date.now()}`,
            createdAt: new Date().toISOString()
        };
        
        this.templates.push(newTemplate);
        this.saveTemplates();
        return newTemplate;
    }

    deleteTemplate(id: string): boolean {
        const index = this.templates.findIndex(t => t.id === id);
        if (index > -1) {
            this.templates.splice(index, 1);
            this.saveTemplates();
            return true;
        }
        return false;
    }

    generatePreview(template: Template, sampleData: Record<string, any>): string {
        let html = template.htmlTemplate;
        
        // Ersetze Platzhalter mit Beispieldaten
        Object.entries(sampleData).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            html = html.replace(regex, value);
        });
        
        return html;
    }
}

// --- PASSWORT-SCHUTZ --- //
class PasswordProtection {
    private isAuthenticated = false;
    private password = process.env.SITE_PASSWORD || 'admin123';

    constructor() {
        this.checkAuthentication();
    }

    private checkAuthentication() {
        const stored = sessionStorage.getItem('authenticated');
        this.isAuthenticated = stored === 'true';
        
        if (!this.isAuthenticated) {
            this.showPasswordPrompt();
        }
    }

    private showPasswordPrompt() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9); z-index: 10000; display: flex;
            align-items: center; justify-content: center;
        `;
        
        const form = document.createElement('form');
        form.style.cssText = `
            background: white; padding: 2rem; border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        
        form.innerHTML = `
            <h2 style="margin-bottom: 1rem; color: #333;">Passwort erforderlich</h2>
            <input type="password" placeholder="Passwort eingeben" 
                   style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #ddd; border-radius: 4px;">
            <button type="submit" style="width: 100%; padding: 0.75rem; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Anmelden
            </button>
            <div id="error-msg" style="color: red; margin-top: 0.5rem; display: none;">Falsches Passwort</div>
        `;
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = form.querySelector('input') as HTMLInputElement;
            const errorMsg = form.querySelector('#error-msg') as HTMLElement;
            
            if (input.value === this.password) {
                sessionStorage.setItem('authenticated', 'true');
                this.isAuthenticated = true;
                document.body.removeChild(overlay);
            } else {
                errorMsg.style.display = 'block';
                input.value = '';
            }
        });
        
        overlay.appendChild(form);
        document.body.appendChild(overlay);
    }

    isLoggedIn(): boolean {
        return this.isAuthenticated;
    }
}

// --- INITIALISIERUNG --- //
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const NANO_BANANA_API_KEY = process.env.NANO_BANANA_API_KEY;
const WORDPRESS_API_URL = process.env.WORDPRESS_API_URL;
const WORDPRESS_USERNAME = process.env.WORDPRESS_USERNAME;
const WORDPRESS_APP_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;

// Supabase Configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Passwort-Schutz initialisieren
const passwordProtection = new PasswordProtection();

// Clients initialisieren
const mediaClient = NANO_BANANA_API_KEY ? new NanoBananaClient(NANO_BANANA_API_KEY) : null;
const wordpressClient = (WORDPRESS_API_URL && WORDPRESS_USERNAME && WORDPRESS_APP_PASSWORD)
    ? new WordPressIntegration(WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD)
    : null;
const templateManager = new TemplateManager();

// Supabase Client initialisieren
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

console.log('🗄️ Supabase:', supabase ? 'Verbunden' : 'Nicht konfiguriert');

// --- NEUE FUNKTIONEN FÜR ERWEITERTE FEATURES --- //

async function generateBlogImage(prompt: string, style: string = 'realistic'): Promise<string> {
    if (!mediaClient) {
        throw new Error('Media-Client nicht konfiguriert');
    }
    
    showLoader('Generiere Blog-Bild...');
    try {
        const imageUrl = await mediaClient.generateImage(prompt, style);
        return imageUrl;
    } catch (error) {
        console.error('Bildgenerierung fehlgeschlagen:', error);
        throw error;
    } finally {
        hideLoader();
    }
}

async function generateVideo(prompt: string, duration: number = 5): Promise<string> {
    if (!mediaClient || !ENABLE_VIDEO_GENERATION) {
        throw new Error('Video-Generierung nicht verfügbar');
    }
    
    showLoader('Generiere Video... (Dies kann einige Minuten dauern)');
    try {
        const videoUrl = await mediaClient.generateVideo(prompt, duration);
        return videoUrl;
    } catch (error) {
        console.error('Video-Generierung fehlgeschlagen:', error);
        throw error;
    } finally {
        hideLoader();
    }
}

async function generateThumbnail(title: string, style: string = 'youtube'): Promise<string> {
    if (!mediaClient) {
        throw new Error('Media-Client nicht konfiguriert');
    }
    
    showLoader('Generiere Thumbnail...');
    try {
        const thumbnailUrl = await mediaClient.generateThumbnail(title, style);
        return thumbnailUrl;
    } catch (error) {
        console.error('Thumbnail-Generierung fehlgeschlagen:', error);
        throw error;
    } finally {
        hideLoader();
    }
}

async function exportToWordPress(post: Post): Promise<void> {
    if (!wordpressClient || !ENABLE_WORDPRESS_EXPORT) {
        throw new Error('WordPress-Export nicht verfügbar');
    }
    
    showLoader('Exportiere zu WordPress...');
    try {
        // Bild hochladen falls vorhanden
        let featuredMediaId = undefined;
        if (post.image?.base64) {
            const imageBlob = dataURLtoBlob(post.image.base64);
            const mediaResponse = await wordpressClient.uploadMedia(imageBlob, `${post.id}-featured.jpg`);
            featuredMediaId = mediaResponse.id;
        }
        
        // Gutenberg-Content erstellen
        const gutenbergContent = wordpressClient.convertToGutenberg(post.htmlContent);
        
        const wpPost: WordPressPost = {
            title: post.title,
            content: gutenbergContent,
            status: 'draft',
            featured_media: featuredMediaId,
            meta: {
                _yoast_wpseo_title: post.metaTitle,
                _yoast_wpseo_metadesc: post.metaDescription
            }
        };
        
        const response = await wordpressClient.createPost(wpPost);
        
        // Post-ID speichern
        post.wordpressId = response.id;
        savePost(post);
        
        showSuccess(`Post erfolgreich zu WordPress exportiert! ID: ${response.id}`);
    } catch (error) {
        console.error('WordPress-Export fehlgeschlagen:', error);
        showError('WordPress-Export fehlgeschlagen: ' + error.message);
    } finally {
        hideLoader();
    }
}

function dataURLtoBlob(dataURL: string): Blob {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

function showSuccess(message: string) {
    console.log('SUCCESS:', message);
    showToast(message, 'success');
}

function showError(message: string) {
    console.error('ERROR:', message);
    showToast(message, 'error');
}

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    // Entferne alten Toast falls vorhanden
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) {
        existingToast.remove();
    }

    // Erstelle Toast Element
    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        font-size: 14px;
        z-index: 10001;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 400px;
        word-wrap: break-word;
    `;

    // Setze Farbe basierend auf Typ
    if (type === 'success') {
        toast.style.backgroundColor = '#4caf50';
    } else if (type === 'error') {
        toast.style.backgroundColor = '#f44336';
    } else {
        toast.style.backgroundColor = '#2196F3';
    }

    toast.textContent = message;
    document.body.appendChild(toast);

    // Animation hinzufügen
    if (!document.getElementById('toast-animation-style')) {
        const style = document.createElement('style');
        style.id = 'toast-animation-style';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Auto-remove nach 5 Sekunden
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function showLoader(message: string) {
    console.log('LOADING:', message);

    // Entferne alten Loader falls vorhanden
    hideLoader();

    // Erstelle Loader Overlay
    const loaderOverlay = document.createElement('div');
    loaderOverlay.id = 'loader-overlay';
    loaderOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
    `;

    // Erstelle Loader Container
    const loaderContainer = document.createElement('div');
    loaderContainer.style.cssText = `
        background: white;
        padding: 32px;
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        max-width: 90%;
    `;

    // Erstelle Spinner
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
        margin: 0 auto 16px auto;
    `;

    // Spinner Animation
    if (!document.getElementById('spinner-animation-style')) {
        const style = document.createElement('style');
        style.id = 'spinner-animation-style';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    // Erstelle Text
    const loaderText = document.createElement('p');
    loaderText.style.cssText = `
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: #333;
    `;
    loaderText.textContent = message;

    loaderContainer.appendChild(spinner);
    loaderContainer.appendChild(loaderText);
    loaderOverlay.appendChild(loaderContainer);
    document.body.appendChild(loaderOverlay);
}

function hideLoader() {
    const loader = document.getElementById('loader-overlay');
    if (loader) {
        loader.remove();
    }
    console.log('LOADING: Complete');
}

function savePost(post: Post) {
    // Implementierung für Post speichern
    console.log('Saving post:', post.id);
}

// Stelle sicher, dass die App nur lädt wenn authentifiziert
// Am Ende der Datei - ersetzen Sie:
if (passwordProtection.isLoggedIn()) {
    console.log('🚀 AI Content Platform initialisiert');
    console.log(`📱 Features: Bilder=${!!mediaClient}, Videos=${ENABLE_VIDEO_GENERATION}, WordPress=${ENABLE_WORDPRESS_EXPORT}`);
    
    // DOM Event Listeners initialisieren - KORRIGIERT
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }
}

function initializeApp() {
    try {
        console.log('🎯 Initialisiere Event Listeners...');
        
        // Generate Button - SICHER
        const generateBtn = document.getElementById('generate-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', handleGenerate);
            console.log('✅ Generate Button Event Listener hinzugefügt');
        } else {
            console.error('❌ Generate Button nicht gefunden!');
        }
        
        // Tab Navigation - SICHER
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const tabName = target.getAttribute('data-tab');
                
                // Remove active class
                tabButtons.forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.sidebar-panel').forEach(panel => panel.classList.remove('active'));
                
                // Add active class
                target.classList.add('active');
                const panel = document.getElementById(`${tabName}-panel`);
                if (panel) panel.classList.add('active');
            });
        });
        
        // Theme Toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                document.body.classList.toggle('light-mode');
                localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
            });
        }

        // Load saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
        }

        // Back Button
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                const outputScreen = document.getElementById('output-screen');
                const inputScreen = document.getElementById('input-screen');
                if (outputScreen && inputScreen) {
                    outputScreen.style.display = 'none';
                    inputScreen.style.display = 'flex';
                }
            });
        }

        // Export Buttons
        const downloadMdBtn = document.getElementById('download-md-btn');
        if (downloadMdBtn) {
            downloadMdBtn.addEventListener('click', () => exportAsMarkdown());
        }

        const downloadHtmlBtn = document.getElementById('download-html-btn');
        if (downloadHtmlBtn) {
            downloadHtmlBtn.addEventListener('click', () => exportAsHTML());
        }

        const downloadPdfBtn = document.getElementById('download-pdf-btn');
        if (downloadPdfBtn) {
            downloadPdfBtn.addEventListener('click', () => exportAsPDF());
        }

        // Supabase Save Button
        const saveToSupabaseBtn = document.getElementById('save-to-supabase-btn');
        if (saveToSupabaseBtn) {
            saveToSupabaseBtn.addEventListener('click', () => saveToSupabase());
            console.log('✅ Supabase Button Event Listener hinzugefügt');
        }

        // Modal Close Buttons
        const closeModalBtns = document.querySelectorAll('.close-modal-btn');
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = (e.target as HTMLElement).closest('.modal-overlay');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Close modals on overlay click
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    (modal as HTMLElement).style.display = 'none';
                }
            });
        });

        console.log('✅ Event Listeners erfolgreich initialisiert!');
    } catch (error) {
        console.error('❌ Fehler bei Event Listener Initialisierung:', error);
    }
}

async function handleGenerate() {
    const topic = (document.getElementById('topic') as HTMLInputElement)?.value;
    const targetLocation = (document.getElementById('target-location') as HTMLInputElement)?.value;
    const language = (document.getElementById('language') as HTMLSelectElement)?.value || 'Deutsch';
    const length = (document.getElementById('length') as HTMLSelectElement)?.value || 'ca. 1000 Wörter';
    const tone = (document.getElementById('tone') as HTMLSelectElement)?.value || 'Professionell';
    const structure = (document.getElementById('structure') as HTMLSelectElement)?.value || 'Standard-Blogbeitrag';

    if (!topic) {
        showError('Bitte geben Sie ein Thema ein!');
        return;
    }

    if (!GEMINI_API_KEY) {
        showError('GEMINI_API_KEY ist nicht konfiguriert! Bitte setzen Sie die API-Key in der .env.local Datei.');
        return;
    }

    try {
        showLoader('Generiere Content mit Google Gemini AI...');

        // Detaillierten Prompt erstellen
        const prompt = `Schreibe einen ${structure} über das Thema: ${topic}
${targetLocation ? `Zielregion: ${targetLocation}` : ''}

Anforderungen:
- Sprache: ${language}
- Länge: ${length}
- Tonfall: ${tone}
- Struktur: ${structure}

Bitte erstelle einen gut strukturierten, informativen Artikel mit:
- Ansprechender Einleitung
- Übersichtlicher Gliederung mit Zwischenüberschriften
- Informativen Absätzen
- Praktischen Beispielen wo möglich
- Klarem Fazit

Formatiere den Artikel in HTML mit semantischen Tags (h1, h2, h3, p, ul, ol, etc.).`;

        console.log('🤖 Sende Anfrage an Gemini API...');

        // Gemini API initialisieren und aufrufen
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const generatedText = response.text();

        console.log('✅ Content erfolgreich generiert!');

        hideLoader();
        showSuccess('Content erfolgreich generiert!');

        // Zeige Ergebnis mit DOMPurify für Sicherheit
        const outputContent = document.querySelector('.output-content');
        if (outputContent) {
            // Sanitize HTML to prevent XSS
            const sanitizedHTML = DOMPurify.sanitize(generatedText);
            outputContent.innerHTML = sanitizedHTML;

            // Scrolle zum Output
            outputContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Speichere generierten Content für Supabase Export
        const turndownService = new TurndownService();
        const markdownContent = turndownService.turndown(generatedText);

        currentGeneratedPost = {
            title: topic,
            content: markdownContent,
            htmlContent: generatedText,
            inputs: {
                topic,
                targetLocation,
                language,
                length,
                tone,
                structure
            }
        };

        console.log('📝 Content für Supabase-Export vorbereitet');

        // Zeige Output-Screen falls versteckt
        const outputScreen = document.getElementById('output-screen');
        const inputScreen = document.getElementById('input-screen');
        if (outputScreen && inputScreen) {
            inputScreen.style.display = 'none';
            outputScreen.style.display = 'flex';
        }

    } catch (error: any) {
        hideLoader();
        console.error('❌ Fehler bei der Generierung:', error);
        showError(`Fehler bei der Content-Generierung: ${error.message || error}`);
    }
}

// --- EXPORT FUNKTIONEN --- //

function exportAsMarkdown() {
    try {
        const outputContent = document.querySelector(".output-content");
        if (!outputContent) {
            showError("Kein Content zum Exportieren vorhanden!");
            return;
        }

        // Konvertiere HTML zu Markdown mit TurndownService
        const turndownService = new TurndownService({
            headingStyle: "atx",
            codeBlockStyle: "fenced"
        });

        const markdown = turndownService.turndown(outputContent.innerHTML);

        // Download erstellen
        const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `artikel-${Date.now()}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showSuccess("Markdown-Datei erfolgreich heruntergeladen!");
    } catch (error: any) {
        console.error("Export als Markdown fehlgeschlagen:", error);
        showError(`Export fehlgeschlagen: ${error.message || error}`);
    }
}

function exportAsHTML() {
    try {
        const outputContent = document.querySelector(".output-content");
        if (!outputContent) {
            showError("Kein Content zum Exportieren vorhanden!");
            return;
        }

        // Erstelle vollständiges HTML-Dokument
        const htmlContent = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generierter Artikel</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            font-weight: 600;
        }
        h1 { font-size: 2.5em; }
        h2 { font-size: 2em; }
        h3 { font-size: 1.5em; }
        p { margin-bottom: 1em; }
        ul, ol { margin-bottom: 1em; padding-left: 2em; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
        pre { background: #f4f4f4; padding: 1em; border-radius: 6px; overflow-x: auto; }
        img { max-width: 100%; height: auto; }
    </style>
</head>
<body>
${outputContent.innerHTML}
</body>
</html>`;

        // Download erstellen
        const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `artikel-${Date.now()}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showSuccess("HTML-Datei erfolgreich heruntergeladen!");
    } catch (error: any) {
        console.error("Export als HTML fehlgeschlagen:", error);
        showError(`Export fehlgeschlagen: ${error.message || error}`);
    }
}

function exportAsPDF() {
    try {
        const outputContent = document.querySelector(".output-content");
        if (!outputContent) {
            showError("Kein Content zum Exportieren vorhanden!");
            return;
        }

        showLoader("Erstelle PDF...");

        // Verwende jsPDF
        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 20;
        const maxWidth = pageWidth - (margin * 2);

        // Konvertiere HTML zu Text (einfache Version)
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = outputContent.innerHTML;
        const text = tempDiv.innerText || tempDiv.textContent || "";

        // Füge Text zum PDF hinzu
        pdf.setFontSize(12);
        const lines = pdf.splitTextToSize(text, maxWidth);

        let y = margin;
        lines.forEach((line: string) => {
            if (y > pageHeight - margin) {
                pdf.addPage();
                y = margin;
            }
            pdf.text(line, margin, y);
            y += 7;
        });

        // Download PDF
        pdf.save(`artikel-${Date.now()}.pdf`);

        hideLoader();
        showSuccess("PDF erfolgreich erstellt!");
    } catch (error: any) {
        hideLoader();
        console.error("Export als PDF fehlgeschlagen:", error);
        showError(`PDF-Export fehlgeschlagen: ${error.message || error}`);
    }
}

// --- SUPABASE INTEGRATION --- //

// Globale Variable für den aktuell generierten Content
let currentGeneratedPost: {
    title: string;
    content: string;
    htmlContent: string;
    inputs: Record<string, any>;
} | null = null;

async function saveToSupabase() {
    if (!supabase) {
        showError('Supabase ist nicht konfiguriert! Bitte setzen Sie VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in der .env.local Datei.');
        return;
    }

    if (!currentGeneratedPost) {
        showError('Kein generierter Content vorhanden zum Speichern!');
        return;
    }

    try {
        showLoader('Speichere in Supabase Datenbank...');

        // Erstelle den Post für Supabase
        const postData: Database['public']['Tables']['posts']['Insert'] = {
            title: currentGeneratedPost.title,
            content: currentGeneratedPost.content,
            html_content: currentGeneratedPost.htmlContent,
            meta_title: currentGeneratedPost.title,
            meta_description: currentGeneratedPost.content.substring(0, 160),
            permalink: currentGeneratedPost.title.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, ''),
            inputs: currentGeneratedPost.inputs,
            schema: null,
            image_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Speichere in Supabase
        const { data, error } = await supabase
            .from('posts')
            .insert(postData)
            .select()
            .single();

        if (error) {
            console.error('Supabase Error:', error);
            throw new Error(error.message);
        }

        console.log('✅ Post in Supabase gespeichert:', data);

        hideLoader();
        showSuccess(`Content erfolgreich in Datenbank gespeichert! ID: ${data.id.substring(0, 8)}...`);

    } catch (error: any) {
        hideLoader();
        console.error('Fehler beim Speichern in Supabase:', error);
        showError(`Speichern fehlgeschlagen: ${error.message || error}`);
    }
}

async function loadPostsFromSupabase() {
    if (!supabase) {
        showError('Supabase ist nicht konfiguriert!');
        return;
    }

    try {
        showLoader('Lade Posts aus Datenbank...');

        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            throw new Error(error.message);
        }

        hideLoader();
        console.log('📚 Geladene Posts:', data);
        showSuccess(`${data?.length || 0} Posts aus Datenbank geladen!`);

        return data;

    } catch (error: any) {
        hideLoader();
        console.error('Fehler beim Laden von Supabase:', error);
        showError(`Laden fehlgeschlagen: ${error.message || error}`);
        return [];
    }
}

