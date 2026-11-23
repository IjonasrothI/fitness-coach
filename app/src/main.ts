import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

// Ohne diesen Aufruf darf Safari die Daten bei Speicherknappheit löschen.
navigator.storage?.persist?.().catch(() => {});

export default mount(App, { target: document.getElementById('app')! });
