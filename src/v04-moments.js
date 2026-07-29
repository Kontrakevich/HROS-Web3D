import {bootUI,editMoment,fail} from './v04/ui.js';
import {bootEnhancer} from './v04/enhance.js';
bootUI();
document.addEventListener('click',event=>{const create=event.target.closest('#momentsAdd,#addMoment');if(create){event.preventDefault();event.stopImmediatePropagation();editMoment().catch(error=>fail(error.message));return;}const edit=event.target.closest('[data-v04-edit]');if(edit){event.preventDefault();editMoment(edit.dataset.v04Edit).catch(error=>fail(error.message));}},true);
bootEnhancer();
