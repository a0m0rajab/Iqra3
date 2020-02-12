"use strict";
/**
 * div element that shows page info
 */
var bilgi;
/**
 * Array where page refs are stored -- used in table view
 */
var pRefs;
/**
 * Array where word refs are stored -- used in list view
 */
var wRefs;
/**
 * Global array to hold the places of Sajda.
 * used in marking sajdah verses
 */
var sajda;
/**
 * child window (or tab) to display Quran
 * the same window is used on each click
 * (this is much better than <a> tag)
 */
var iqra;
/**
 * base color in the table -- default is blue
 * hue indicates angle in color wheel
 */
var HUE = (isRemote() && localStorage.mujamHue) || 240

/**
 * A map holds the letters and its roots.
 * set at report2 @see report2
 */
const letterToRoots = new Map();
/**
 * A map holds the roots and its words.
 * set at report2 @see report2
 */
const rootToWords = new Map();
/**
 * A map holds the roots and its counts.
 * set at report2 @see report2
 */
const rootToCounts = new Map();
/**
 * A map holds the words and its references.
 * set at report2 @see report2
 */
const wordToRefs = new Map();
/**
 * returns Buckwalter code of the current item in menu2
 */
function currentRoot() {
    if (!menu2.value) return null
    let [v] = menu2.value.split(EM_SPACE)
    return toBuckwalter(v)
}

/**
 * Parsing and using remote data. 
 * @see makeMenu
 * 
 * @param {string} t text from remote data.
 */
function report2(t) {
    function convert(s) {
        let [w, n] = s.split(' ')
        let a = toArabic(w)
        //convert space to em-space " "
        return [a, a+EM_SPACE+n] 
    }
    let line = t.split('\n')
    let m = line.length - 1
    console.log(t.length + " chars " + m + " lines");
    let i = 0;
    while (i < m) { //for each line
        let [root, number] = convert(line[i])
        rootToCounts.set(root, number);
        let j = i + 1
        let list = []
        while (j < m) {
            let [xxx, s] = convert(line[j])
            let k = s.indexOf('\t')
            if (k <= 0) break;
            let word = s.substring(0, k)
            let refs = s.substring(k + 1)
            wordToRefs.set(word, refs)
            list.push(word); j++;
        }
        i = j;
        list.sort();
        let ch = root[0]; //first char
        let x = letterToRoots.get(ch);
        if (x) x.push(number);
        else letterToRoots.set(ch, [number]);
        rootToWords.set(number, list);
    }
    let keys = [...letterToRoots.keys()];
    // sort the root list for each letter
    for (let k of keys) letterToRoots.get(k).sort()
    // sort and set menu1 (letters)
    makeMenu(menu1, keys.sort());
    if (!gotoHashRoot()) selectRoot("سجد");
}
/**
 * Read data file from link, then store it.
 * @see report2
 */
function readData() {
    out2.innerText = "Reading data";
    //const DATA_URL = "https://maeyler.github.io/Iqra3/data/" in common.js
    fetch(DATA_URL+"refs.txt")
        .then(r => r.text()) //response
        .then(report2); //text
}

/**
 * Make the targeted menu the document has three.(letters, roots, words)
 * The first element  will be selected.
 * 
 * @param {object} m targeted menu object (html)
 * @param {array} a array elements of the menu.
 */
function makeMenu(m, a) { //first item is selected
    if (a) m.innerHTML = "<option selected>" + a.join("<option>");
}
/**
 * Select the letter from the menu, if no parameter entered the letter will 
 * be the menu1 value. Then Build menu2 based on the selected character.
 * @see makeMenu
 * 
 * @param {string} ch letter to be selected (Arabic)
 */
function selectLetter(ch) {
    if (!ch) ch = menu1.value;
    else if (ch == menu1.value) return;
    else menu1.value = ch;
    makeMenu(menu2, letterToRoots.get(ch));
    menu2.value = '';
}
/**
 * select specified root, if undefined the menu2 value will be the selected.
 * 
 * @param {string} root to be seleceted, example: سجد 23
 */
function selectRoot(root, modifyHash=true) { //root in Arabic 
    if (!root) [root] = menu2.value.split(EM_SPACE);
    else if (menu2.value.startsWith(root)) return;
    else {
      selectLetter(root.charAt(0))
      menu2.value = rootToCounts.get(root);
    }
    let cnt = rootToCounts.get(root);
    let lst = rootToWords.get(cnt);
    let nL = lst? lst.length : 0;
    if (lst) makeMenu(menu3, lst);
    if (nL > 1)
        menu3.selectedIndex = -1; //do not select Word
    menu3.disabled = (nL == 1);
    menu3.style.color = (nL == 1 ? "gray" : "");
    //combine refs in lst
    combine.hidden = true;
    if (!modifyHash) return
    //replace special chars
    let b = encodeURI(toBuckwalter(root))
    location.hash = "#r=" + b;
}
/**
 * Select word, if undefined menu3 values will be the selected one.
 * when its used combine will be shown.
 * 
 * get the references from wordsToRefs map.
 * 
 * @param {string} word to be selected.
 */
function selectWord(word) { //called by menu3 and list items
    if (!word) word = menu3.value;
    else if (word == menu3.value) return;
    else menu3.value = word;
    combine.hidden = false;
    let str = wordToRefs.get(word)
    parseRefs(word, str)
    for (let i of liste.querySelectorAll('li'))
      i.style.background = 
        i.firstElementChild.innerText == word? '#fec' : ''
}
/**
 * calculate the index array for given root.
 * 
 * @param {string} root to be displayed
 * @returns {Array} Array of VerseRef's
 */
function getReferences(root) {
    let cnt = rootToCounts.get(root);
    let refA = []
    for (let word of rootToWords.get(cnt)) {
        let enc = wordToRefs.get(word)
        let set = RefSet.fromEncoded(word, enc)
        for (let v of set.list) refA.push(v)
        //refA.concat(set.list)  concat returns another Array
        wRefs.push(set)
    }
    return refA.sort((a,b) => (a.index - b.index))
}
/**
 * Make VerseRef array pRefs.
 * 
 * @param {Array} list number Array
 */
function indexToArray(list) {
    pRefs = new Array(nPage + 1)
    for (let v of list) {
        let p = v.page
        if (pRefs[p]) pRefs[p].push(v)
        else pRefs[p] = [v]
    }
}
/**
 * Make wRefs & pRefs for specified roots
 * 
 * @param {Array} roots Array to be displayed
 */
function parseRoots(roots) { //root array in Arabic
    wRefs = []
    let [first, ...rest] = roots
    let i1 = getReferences(first)
    for (let r of rest) {
        let i2 = getReferences(r)
        //find intersection
        i1 = i1.filter(v => //i2.includes(v)
             i2.find(x => x.index == v.index))
    }
    let word = roots.map(x => rootToCounts.get(x)).join(' + ')
    if (roots.length > 1) wRefs = [new RefSet(word, i1)]
    indexToArray(i1); displayTable(word)
}
/**
 * Make wRefs & pRefs for a given topic
 * 
 * @param {string} topic
 * @param {string} ref Encoded indexes
 */
function parseRefs(topic, ref) {
    let set = RefSet.fromEncoded(topic, ref)
    indexToArray(set.list); wRefs = [set]; 
    displayTable(topic)
}
/**
 * Build and display the HTML list. Uses global Array wRefs
 */
function displayList() {
    const MAX_REFS = 15  //hide larger lists
    const SPAN = '<span class=item>', _SPAN = '</span>'
    let BUTTON = '', _BUTTON = ''
    if (wRefs.length > 1) {
        BUTTON = '<button>'; _BUTTON = '</button>'
    }
    let s = ''
    for (let x of wRefs) { // x is {word, list}
        s += '<li>'+BUTTON+ x.name +_BUTTON+'<div>'
        for (let y of x.list) // y is VerseRef
            s += SPAN+ y.cv +_SPAN
        s += '</div>\n'
    }
    liste.innerHTML = s
    for (let x of liste.querySelectorAll('.item')) {
        x.onmouseenter = doHover
        x.onmouseleave = hideBilgi
    }
    if (!BUTTON) return
    for (let x of liste.querySelectorAll('button')) {
        let div = x.nextElementSibling
        if (div.children.length > MAX_REFS)
            div.hidden = true
        x.onclick = function ccc(evt) {
        //x == evt.target && div == x.nextElementSibling
            if (div.hidden) div.hidden = false
            else selectWord(x.innerText)
        } 
    }
}
    /**
 * Build and display the HTML table. Uses global Array pRefs
 * 
 * @param {String} word: on single word
 */
function displayTable(word) {
    // put three zeros on the first of the number (K)
    function threeDigits(k) { //same as (""+k).padStart(3,"0")
        let s = "" + k
        while (s.length < 3) s = "0" + s
        return s
    }
    // get colour based on the number of verses in a page.
    function toColor(n) {
        if (n == 0) return ""
        let L = 96 - 6 * Math.min(n, 16)
        return "background: hsl("+HUE+", 100%, "+L+"%)"
    }
    // m number of rows, 20 pages per row.
    const m = 30, n = 20
    let row = "<th>Sayfa</th>"
    for (let j = 1; j <= n; j++) {
        row += "<th>" + (j % 10) + "</th>" //use last digit
    }
    let text = "<tr>" + row + "</tr>"
    let pn = 0, numC = 0, numP = 0  //counters
    for (let i = 1; i <= m + 1; i++) {
        let z = i > m ? m : i
        let s2 = '' //unused "<span class=t1>Cüz " + z + "</span>"
        row = "<th class=first>" +threeDigits(pn)+ s2 + "</th>"
        let U = i > m ? 4 : n
        for (let j = 1; j <= U; j++) {
            pn++  // pn == 20*(i-1)+j  page number
            let c = 0, L = pRefs[pn]
            if (L) { //update counts
                c = L.length
                numC += c; numP++
            }
            let ch = sajda.includes(pn)? "۩" : "&nbsp;"
            row += "<td style='" +toColor(c)+"'>"+ ch + "</td>"
        }
        if (i > m) { //use th for the last row
          row += "<th colspan=13>Iqra "+VERSION+" (C) 2019 MAE</th>"
           +"<th id=corpus colspan=3 onClick=doClick2()>Corpus</th>"
        }
        text += "<tr>" + row + "</tr>"
    }
    // end of table
    tablo.innerHTML = text
    tablo.oncontextmenu = showMenuK
    //let word = wRefs[0].name  given as argument
    document.title = TITLE + " -- " + word
    out1.innerText = numP + " sayfa"
    out2.innerText = numP + " sayfa"
    out3.innerText = word
    console.log(word, numP, wRefs)
    menu3.hidden = wRefs.length == 1
    for (let x of tablo.querySelectorAll('td')) {
        x.onmouseenter = doHover
        x.onmouseleave = hideBilgi
    }
    bilgi = document.createElement('div') //lost within table
    bilgi.id = 'bilgi'; document.body.append(bilgi)
    bilgi.onclick = doClick
}

function hideBilgi() {
    if (!menuK.style.display) hideElement(bilgi);
}

/**
 * Open the quran webPage after checking it's event.
 * 
 * @param {*} evt get the event trigger. 
 */
function doClick(evt) {
    //do not handle if menuK is on or bilgi is off
    if (menuK.style.display || !bilgi.style.display) return
    evt.preventDefault()
    let [nam, ref] = bilgi.innerText.split(EM_SPACE)
    let [xx, p] = nam.split(/\.| /)  //dot or space
    let h;
    if (pRefs[p]) { //use first reference & root
        let [cv] = ref.split(' ')
        h = "#v="+cv
        let d = decodedHash()
        if (!d.startsWith('#')) h += "&r="+d
    } else { //use page number
        h = "#p="+p;
    }
    console.log(h); hideMenus()
    iqra = window.open("reader"+EXT + h, "iqra")
}
/**
 * Open Corpus quran link that related to the selected word specific word. 
 *  
 * @see toBuckwalter
 * 
 */
function doClick2() {
    const REF = "http://corpus.quran.com/qurandictionary.jsp";
    let p = "";
    if (menu2.value) p = "?q=" + currentRoot()
    console.log("Corpus" + p);
    window.open(REF + p, "NewTab")  //, "resizable,scrollbars");
}
/**
 * Use the hash part of URL in the address bar
 *
 * @returns null (no hash), decoded hash ('r='), or as-is (named) 
 * 
 */
function decodedHash() {
  let h = location.hash
  if (h.length < 4) return null
  if (h.startsWith('#r='))
    //replace special chars: call decodeURI() by A Rajab
    return decodeURI(h.substring(3))  //strip '#r='
  else return h
}
/**
 * Use the hash part of URL in the address bar
 *
 * @returns true if hash part of URL is not empty
 * 
 */
function gotoHashRoot() {
  let h = decodedHash()
  if (!h) return false
  showSelections(false)
  if (h.startsWith('#')) { //given topic
    let [top, ref] = h.substring(1).split('=')
    parseRefs(top, ref)
    menu2.value=''; menu3.value=''
    combine.hidden = true
  } else { //given roots
    let roots = h.split('&r=').map(toArabic)
    parseRoots(roots)
    selectRoot(roots[0], false)
  }
  return true
}
/**
 * Initialize the globals
 * 
 * @param none
 * 
 */
function initMujam() {
    version.innerText = 'Iqra '+VERSION;
    showSelections(false);
    // mark places for sajda
    //let str = "1w82bu2i62ne2s430l38z3gg3pq42y4a74qm5k15q5";
    //[sajda, ] = parseRefs('Secde', str);
sajda = [175, 250, 271, 292, 308, 333, 364, 378, 415, 453, 479, 527, 589, 597, 999]
    let letters = [];
    for (let c=1575; c<1609; c++) letters.push(String.fromCharCode(c));
    makeMenu(menu1, letters); 
    try {
        readData();
    } catch(err) { 
        out2.innerText = ""+err;
    }
    window.name = "mujam"
    window.onhashchange = gotoHashRoot
    menuFn()
}

  /**
  * Menu functions
  */
function menuFn() {
  function menuItem(m) {
      if (m == 'Y' || m == '?')
        openSitePage('Y')
      let s = bilgi.innerText
      if (!s) return
      let [nam, ref] = s.split(EM_SPACE)
      if (!ref) return
      let [cv] = ref.split(' ')
      let [c, v] = cv.split(':')
      openSiteVerse(m, c, v)
      hideMenus()
  }
  menuK.onclick = (evt) => {
      evt.preventDefault()
      menuItem(evt.target.innerText[0])
  }
  document.onclick = (evt) => {
      if (!menuK.style.display) {
        let t = evt.target.tagName
        if (t == "TD" || t == "SPAN") return
      }
      hideMenus(); evt.preventDefault()
  }
  document.onkeydown = (evt) => {
    if (evt.key == 'Escape') hideMenus()
    else if (evt.key == 'F1') 
      openSitePage('Y') //Yardım
    else if (menuK.style.display) 
      menuItem(evt.key.toUpperCase())
  }
  window.hideMenus = () => { 
      hideElement(menuK); hideElement(bilgi)
  }
  window.showMenuK = (evt) => { 
      evt.preventDefault(); //hideElement(bilgi)
      let y = Math.max(evt.clientY-200, 0)
      setPosition(menuK, evt.clientX, y)
  }
}

function showSelections(show) {
    if (show) {
      div1.style.display = ''
      div2.style.display = 'none'
      displayList(out3.innerText)
} else {
      div1.style.display = 'none'
      div2.style.display = ''
    }
}
function getPageOf(td) {
    let r = td.parentElement.rowIndex;
    let p = 20*(r-1) + td.cellIndex;
    return p
}
function doHover(evt) {  //listener for each td and span element
    if (menuK.style.display) return
    let cls, ref, cw
    if (evt.target.tagName == 'SPAN') {
        let cv = evt.target.innerText
        ref = VerseRef.fromChapVerse(cv)
        cls = 't2>' //background yellow
        cw = liste.clientWidth
    } else { // TD
        let p = getPageOf(evt.target)
        if (pRefs[p]) {
            let [f, ...L] = pRefs[p]
            ref = f.toString()
            if (L)  //convert Array to string
              ref += ' '+L.map(x => x.cv).join(' ')
                  + EM_SPACE +'('+ (L.length+1) +')'
            cls = 't2>' //background color
        } else { //no ref on this page
            ref = labels[p]
            cls = 't1>' //no color
        }
        cw = tablo.clientWidth
}
    bilgi.innerHTML = "<div class="+ cls + ref +"</div>"
    evt.target.append(bilgi); 
    //center over evt.target
    //setPosition(bilgi, evt.clientX, 20, 180)
    let mw = bilgi.clientWidth || 180
    let x0 = evt.target.offsetLeft + 10
    let dx = Math.max(-mw/2, -x0)  
    //if (x0-mw/2 < 0) dx = -x0
    cw = (cw || 460) + 16
    dx = Math.min(dx, cw-mw-x0)
    //if (x0+mw/2 > cw) dx = cw-mw-x0
    bilgi.style.left = (dx)+'px'
    bilgi.style.display = "block"
}
function test(prop='index') {
    if (!div1.style.display) showSelections(true)
    let testEval = (a) => {
      let e = eval(a); console.log(a, e); return e
    }
    //a and b contain the same objects
    let a = testEval('pRefs.flat() //already sorted')
    let b = testEval('wRefs.map(x => x.list).flat()')
    //convert a and b to string
    b.sort((x, y) => x.index - y.index)
    let testJoin = (a) => a.map(x => x[prop]).join(' ')
    console.log(a = testJoin(a))
    console.log(b = testJoin(b))
    console.log(a == b)
}
