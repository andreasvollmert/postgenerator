(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))r(s);new MutationObserver(s=>{for(const o of s)if(o.type==="childList")for(const n of o.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&r(n)}).observe(document,{childList:!0,subtree:!0});function t(s){const o={};return s.integrity&&(o.integrity=s.integrity),s.referrerPolicy&&(o.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?o.credentials="include":s.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function r(s){if(s.ep)return;s.ep=!0;const o=t(s);fetch(s.href,o)}})();var a=typeof window<"u"?window:{};function u(){var i=a.DOMParser,e=!1;try{new i().parseFromString("","text/html")&&(e=!0)}catch{}return e}function h(){var i=function(){};return p()?i.prototype.parseFromString=function(e){var t=new window.ActiveXObject("htmlfile");return t.designMode="on",t.open(),t.write(e),t.close(),t}:i.prototype.parseFromString=function(e){var t=document.implementation.createHTMLDocument("");return t.open(),t.write(e),t.close(),t},i}function p(){var i=!1;try{document.implementation.createHTMLDocument("").open()}catch{a.ActiveXObject&&(i=!0)}return i}u()?a.DOMParser:h();var c={};const d=c.ENABLE_VIDEO_GENERATION==="true",m=c.ENABLE_WORDPRESS_EXPORT==="true";class g{constructor(e){this.baseURL="https://api.nanobana.com/v1",this.apiKey=e}async generateImage(e,t="realistic"){try{const r=await fetch(`${this.baseURL}/generate/image`,{method:"POST",headers:{Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({prompt:e,style:t,width:1024,height:1024,steps:30,guidance_scale:7.5})});if(!r.ok)throw new Error(`Nano Banana API Error: ${r.status}`);const s=await r.json();return s.image_url||s.images[0]}catch(r){throw console.error("Nano Banana Bildgenerierung fehlgeschlagen:",r),r}}async generateVideo(e,t=5){if(!d)throw new Error("Video-Generierung ist deaktiviert");try{const r=await fetch(`${this.baseURL}/generate/video`,{method:"POST",headers:{Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({prompt:e,duration:t,fps:24,width:1280,height:720})});if(!r.ok)throw new Error(`Video-Generierung fehlgeschlagen: ${r.status}`);return(await r.json()).video_url}catch(r){throw console.error("Video-Generierung fehlgeschlagen:",r),r}}async generateThumbnail(e,t="youtube"){const r=`Create a compelling ${t} thumbnail for: "${e}". Bold text, eye-catching colors, professional design.`;return this.generateImage(r,"digital-art")}}class f{constructor(){this.templates=[],this.storageKey="ai-content-templates",this.loadTemplates(),this.initializeDefaultTemplates()}loadTemplates(){try{const e=localStorage.getItem(this.storageKey);e&&(this.templates=JSON.parse(e))}catch(e){console.error("Template laden fehlgeschlagen:",e)}}saveTemplates(){try{localStorage.setItem(this.storageKey,JSON.stringify(this.templates))}catch(e){console.error("Template speichern fehlgeschlagen:",e)}}initializeDefaultTemplates(){this.templates.length===0&&(this.templates=[{id:"blog-post-standard",name:"Standard Blog Post",description:"Klassischer Blog-Post mit Einleitung, Hauptteil und Fazit",category:"Blog",settings:{includeIntro:!0,includeConclusion:!0,headingStyle:"h2",wordCount:1500},htmlTemplate:`
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
                    `,createdAt:new Date().toISOString()},{id:"product-review",name:"Produkt-Review",description:"Template für Produktbewertungen mit Pros/Cons",category:"Review",settings:{includeRating:!0,includeProsAndCons:!0,includeSpecs:!0},htmlTemplate:`
                        <article class="product-review">
                            <h1>{{title}}</h1>
                            <div class="rating">{{rating}}</div>
                            <div class="pros-cons">
                                <div class="pros">{{pros}}</div>
                                <div class="cons">{{cons}}</div>
                            </div>
                            <div class="content">{{content}}</div>
                        </article>
                    `,createdAt:new Date().toISOString()}],this.saveTemplates())}getTemplates(){return this.templates}getTemplate(e){return this.templates.find(t=>t.id===e)||null}saveTemplate(e){const t={...e,id:`template-${Date.now()}`,createdAt:new Date().toISOString()};return this.templates.push(t),this.saveTemplates(),t}deleteTemplate(e){const t=this.templates.findIndex(r=>r.id===e);return t>-1?(this.templates.splice(t,1),this.saveTemplates(),!0):!1}generatePreview(e,t){let r=e.htmlTemplate;return Object.entries(t).forEach(([s,o])=>{const n=new RegExp(`{{${s}}}`,"g");r=r.replace(n,o)}),r}}class w{constructor(){this.isAuthenticated=!1,this.password="ContentPlatform2024!",this.checkAuthentication()}checkAuthentication(){const e=sessionStorage.getItem("authenticated");this.isAuthenticated=e==="true",this.isAuthenticated||this.showPasswordPrompt()}showPasswordPrompt(){const e=document.createElement("div");e.style.cssText=`
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9); z-index: 10000; display: flex;
            align-items: center; justify-content: center;
        `;const t=document.createElement("form");t.style.cssText=`
            background: white; padding: 2rem; border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `,t.innerHTML=`
            <h2 style="margin-bottom: 1rem; color: #333;">Passwort erforderlich</h2>
            <input type="password" placeholder="Passwort eingeben" 
                   style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #ddd; border-radius: 4px;">
            <button type="submit" style="width: 100%; padding: 0.75rem; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Anmelden
            </button>
            <div id="error-msg" style="color: red; margin-top: 0.5rem; display: none;">Falsches Passwort</div>
        `,t.addEventListener("submit",r=>{r.preventDefault();const s=t.querySelector("input"),o=t.querySelector("#error-msg");s.value===this.password?(sessionStorage.setItem("authenticated","true"),this.isAuthenticated=!0,document.body.removeChild(e)):(o.style.display="block",s.value="")}),e.appendChild(t),document.body.appendChild(e)}isLoggedIn(){return this.isAuthenticated}}const l=c.NANO_BANANA_API_KEY,y=new w,v=l?new g(l):null;new f;y.isLoggedIn()&&(console.log("🚀 AI Content Platform initialisiert"),console.log(`📱 Features: Bilder=${!!v}, Videos=${d}, WordPress=${m}`));
