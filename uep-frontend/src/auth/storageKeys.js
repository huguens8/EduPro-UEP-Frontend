// L'access token n'est plus stocké ici : il vit uniquement en mémoire
// (voir tokenHolder.js) pour ne pas être exposé via localStorage en cas de XSS.
const STORAGE_KEYS = {
  username: 'edupro_username',
  role: 'edupro_role',
  roleLibelle: 'edupro_role_libelle',
};

export default STORAGE_KEYS;
