"use strict";
// Use import and export to avoid calling files in the main page... would be even much prettier and clearner to call it at another place.
import * as common from './common.js';
import * as util from './utilities.js';

console.log("test")

/**
 * Global array to hold the places of Sajda.
 * used in marking sajdah verses
 */
export var sajda;

/**
 * base color in the table -- default is blue
 * hue indicates angle in color wheel
 */
export var   HUE = (common.isRemote() && localStorage.mujamHue) || 240

/**
 * A map holds the letters and its roots.
 * set at report2 @see report2
 */
export const  letterToRoots = new Map();
/**
 * A map holds the roots and its words.
 * set at report2 @see report2
 */
export const  rootToWords = new Map();
/**
 * A map holds the roots and its counts.
 * set at report2 @see report2
 */
export const  rootToCounts = new Map();
/**
 * A map holds the words and its references.
 * set at report2 @see report2
 */
export const  wordToRefs = new Map();
/**
 * returns Buckwalter code of the current item in menu2
 */
export function  currentRoot() {
    if (!menu2.value) return null
    let [v] = menu2.value.split(common.EM_SPACE)
    return toBuckwalter(v)
}

/**
 * 
 * Used to parse indexes from a string encoded by encode36 and add it to index array (indA)
 * 
 * @param {string} str The chapter number.
 * @param {Array} indA index. 
 * 
 */
export function  addIndexes(str, indA) {
    for (let j = 0; j < str.length; j += 3) {
        let code = str.substring(j, j + 3);
        indA.push(util.decode36(code));
    }
}
/**
 * 
 * Get the page of index and add it to page array and the holded verses of the page to refA array.
 * note that: Page array are equal to refA array.
 * 
 * @param {array} indA index array which parsed from add indexes.
 * @returns {array} The index(page number,refA string). 
 * 
 */
export function  indexToArray(indA) {
    let page = [],
        refA = [],
        prev = -1;
    for (let i of indA) {
        let [c, v] = util.toCV(i);
        let cv = c + ":" + v;
        let p = util.pageOf(c, v);
        // if the page are same as before.
        if (prev == p)
        // get pop() as the last element of the array, 
        // then add CV at the end 
            cv = refA.pop() + " " + cv;
        else {
            page.push(p);
            prev = p
        }

        refA.push(cv);
    }
    // only used in tests.
    page.push(999); //999 is sentinel
    return [page, refA];
}
/**
 * Add indexes to array, then parse this array with its pages.
 * @see addIndexes
 * @see indexToArray. 
 * @param {str} str index array which parsed from add indexes.
 * @returns {array} array holds pages number and references number 
 * 
 */
export function  parseRefs(str) {
    let indA = [];
    addIndexes(str, indA);
    return indexToArray(indA)
}
/**
 * Parsing and using remote data. 
 * @see makeMenu
 * 
 * @param {string} t text from remote data.
 */
export function  report2(t) {
    function  convert(s) {
        let [w, n] = s.split(' ')
        let a = common.toArabic(w)
        //convert space to em-space " "
        return [a, a+common.EM_SPACE+n] 
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
    return new Promise( (resolve,reject)=>{
        resolve(keys) 
    });
    
}
/**
 * Read data file from link, then parse it.
 * @see report2
 */
export async function  readData() {
    //export const  DATA_URL = "https://maeyler.github.io/Iqra3/data/" in common.js
     const  r = await fetch(common.DATA_URL + "refs.txt");
     const  t = await r.text();
    return report2(t); //text
}

/**
 * display specified roots, hide the menus.
 * 
 * @param {Array} roots to be displayed
 */
export function  getIndicesOf(root) {
    let cnt = rootToCounts.get(root);
    let list = rootToWords.get(cnt);
    let indA = [];
    for (let w of list) {
        addIndexes(wordToRefs.get(w), indA);
    }
    indA.sort((a, b) => (a - b));
    return indA
}
export * from './mujamUtil.js';