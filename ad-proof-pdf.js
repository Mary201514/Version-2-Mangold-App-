(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MangoldAdPdf=factory()})(this,function(){
 function lineCount(value,width,font,size){let lines=0;for(const paragraph of String(value).split('\n')){let row='';lines++;for(const char of paragraph){if(row&&font.widthOfTextAtSize(row+char,size)>width){lines++;row=char}else row+=char}}return lines}
 function take(value,width,font,size,maxLines){let rows=1,line='',lastSpace=0,i=0;for(const char of value){if(char==='\n'){rows++;line=''}else if(line&&font.widthOfTextAtSize(line+char,size)>width){rows++;line=char}else line+=char;if(/\s/.test(char))lastSpace=i;if(rows>maxLines){const cut=lastSpace>0?lastSpace:i;return [value.slice(0,cut),value.slice(cut).replace(/^\n/,'')]}i+=char.length}return [value,'']}
 async function build({PDFLib,templateBytes,fontBytes,fontkit,values,customer='',job=''}){
  const {PDFDocument,StandardFonts,rgb}=PDFLib,doc=await PDFDocument.load(templateBytes);
  let font;if(fontBytes&&fontkit){doc.registerFontkit(fontkit);font=await doc.embedFont(fontBytes,{subset:true})}else font=await doc.embedFont(StandardFonts.Helvetica);
  const form=doc.getForm(),prepared={...values},characters=new Set(font.getCharacterSet());
  // Preserve the complete text in editable continuation fields instead of clipping it.
  const first=take(prepared.ausgefuehrte_arbeiten||'',495,font,9,6);prepared.ausgefuehrte_arbeiten=first[0]+(first[1]?'\nFortsetzung siehe Seite 2.':'');
  const second=take([first[1],prepared.s2_ausgefuehrte_arbeiten||''].filter(Boolean).join('\n\n'),495,font,9,28);prepared.s2_ausgefuehrte_arbeiten=second[0]+(second[1]?'\nFortsetzung siehe Anlage.':'');
  let remaining=second[1],annex=0;
  while(remaining){annex++;const chunk=take(remaining,495,font,9,54);if(!chunk[0])throw Error('TEXT_LAYOUT');remaining=chunk[1];const page=doc.addPage([595.2756,841.8898]);page.drawText('AD-Nachweis - Ergänzung '+annex,{x:42,y:795,size:17,font,color:rgb(.145,.384,.69)});page.drawText((job+' · '+customer).slice(0,110),{x:42,y:770,size:9,font});const field=form.createTextField('ad_fortsetzung_'+annex);field.enableMultiline();field.addToPage(page,{x:42,y:65,width:511,height:685,font,borderWidth:0,textColor:rgb(.06,.14,.24)});prepared['ad_fortsetzung_'+annex]=chunk[0]}
  for(const [name,value]of Object.entries(prepared)){
   const field=form.getTextField(name);for(const character of value)if(!/[\n\r\t]/.test(character)&&!characters.has(character.codePointAt(0)))throw Error('Die PDF-Schrift unterstützt das Zeichen „'+character+'“ nicht. Der Text bleibt gespeichert; es wird nichts ersetzt.');font.encodeText(value);field.removeMaxLength();field.setText(value);const widget=field.acroField.getWidgets()[0];if(!widget)throw Error('MISSING_WIDGET: '+name);const rect=widget.getRectangle();let size=9;
   if(value.includes('\n')||font.widthOfTextAtSize(value,size)>rect.width-8)field.enableMultiline();
   const fits=s=>{if(!field.isMultiline())return font.widthOfTextAtSize(value,s)<=rect.width-8;const layout=PDFLib.layoutMultilineText(value,{alignment:PDFLib.TextAlignment.Left,font,fontSize:s,bounds:{x:0,y:0,width:rect.width-8,height:rect.height-4}});return layout.lines.length*s*1.35<=rect.height-4&&layout.lines.every(line=>line.width<=rect.width-8)};
   while(size>7.5&&!fits(size))size-=.25;
   if(value&&!fits(size))throw Error('FIELD_TOO_LONG: '+name);
   field.setFontSize(size);field.updateAppearances(font);
  }
  form.updateFieldAppearances(font);doc.setTitle('Außendienst-Nachweis');doc.setSubject('Lokaler Testnachweis – vor Weitergabe fachlich prüfen');doc.setProducer('Mangold Service-Assistent');return doc.save();
 }
 return {build,lineCount};
});
