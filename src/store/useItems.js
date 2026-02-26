import { useState, useEffect } from 'react';
import { loadCats, saveCats } from '../utils/data.js';

export function useCats() {
  const [cats, setCats] = useState(loadCats());

  const updateCats = (newCats) => {
    setCats(newCats);
    saveCats(newCats);
  };

  return [cats, updateCats];
}