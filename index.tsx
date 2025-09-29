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

// Passwort-Schutz initialisieren
const passwordProtection = new PasswordProtection();

// Clients initialisieren
const mediaClient = NANO_BANANA_API_KEY ? new NanoBananaClient(NANO_BANANA_API_KEY) : null;
const wordpressClient = (WORDPRESS_API_URL && WORDPRESS_USERNAME && WORDPRESS_APP_PASSWORD) 
    ? new WordPressIntegration(WORDPRESS_API_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD) 
    : null;
const templateManager = new TemplateManager();

// ... existing code ...
// (Der Rest des bestehenden Codes bleibt unverändert)

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
    // Implementierung für Erfolgs-Nachricht
    console.log('SUCCESS:', message);
}

function showError(message: string) {
    // Implementierung für Fehler-Nachricht
    console.error('ERROR:', message);
}

function showLoader(message: string) {
    // Implementierung für Loader
    console.log('LOADING:', message);
}

function hideLoader() {
    // Implementierung für Loader verstecken
    console.log('LOADING: Complete');
}

function savePost(post: Post) {
    // Implementierung für Post speichern
    console.log('Saving post:', post.id);
}

// Stelle sicher, dass die App nur lädt wenn authentifiziert
if (passwordProtection.isLoggedIn()) {
    console.log('🚀 AI Content Platform initialisiert');
    console.log(`📱 Features: Bilder=${!!mediaClient}, Videos=${ENABLE_VIDEO_GENERATION}, WordPress=${ENABLE_WORDPRESS_EXPORT}`);
}