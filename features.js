installLanguageControl();
// One final rendering hook updates attachments without disturbing text input.
const renderBeforeFeatures=render;
render=function(){renderBeforeFeatures();refreshAttachments();applyLanguage()};
getAiConfig();
render();

installDictation();
