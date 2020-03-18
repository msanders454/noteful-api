const express = require("express");
const path = require("path");
const xss = require("xss");
const FoldersService = require("./folders-service");

const foldersRouter = express.Router();
const jsonParser = express.json();


const serializeFolder = folder => ({
    id: folder.id,
    name: xss(folder.name)
  });

  const sanatizeNote = note => ({
    id: note.id,
    content: xss(note.content),
    note_name: xss(note.note_name),
    date_modified: note.date_modified,
    folder_id: note.folder_id
  });

  foldersRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')  
    FoldersService.getAllFolders(knexInstance)
      .then(folder => {
        res.json(folder.map(serializeFolder))
      })
      .catch(next)
  })

  .post(jsonParser, (req, res, next) => {
    const { name } = req.body
    const newFolder = { name }

    for (const [key, value] of Object.entries(newFolder)) 
       if (value == null) 
          return res.status(400).json({
            error: { message: `Missing '${key}' in request body` }
          })
    newFolder.name = name 
    FoldersService.insertFolder(req.app.get('db'), newFolder)
    .then(folder => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${folder.id}`))
          .json(serializeFolder(folder))
    })
    .catch(next)
  });

  foldersRouter
  .route('/:folder_id')
  .all((req, res, next) => {
    FoldersService.getById(req.app.get('db'),req.params.folder_id)
      .then(folder => {
        if (!folder) {
          return res.status(404).json({
            error: { message: `Folder doesn't exist` }
          })
        }
        res.folder = folder // save the note for the next middleware
        next() // don't forget to call next so the next middleware happens!
       })
        .catch(next)
   })
   .get((req, res, next) => {
    res.json(serializeFolder(res.folder))
  })
  .delete((req, res, next) => {
    FoldersService.deleteFolder(req.app.get('db'),req.params.folder_id)
      .then(() => {
        res.status(204).end()
       })
       .catch(next)
   })

   .patch(jsonParser, (req, res, next) => {
    const { name }= req.body;
    const folderToUpdate = { name };
    console.log(folderToUpdate);
    const numberOfValues = Object.values(folderToUpdate).filter(Boolean).length
    console.log(numberOfValues);
    if (numberOfValues === 0) 
      return res.status(400).json({ error: { message: `Request body must contain a 'name'`}
      })
    
    const knexInstance = req.app.get('db')
    FoldersService.updateFolder(
      knexInstance, 
      req.params.folder_id, 
      folderToUpdate
      )
      .then(numRowsAffected => {
        res.status(204).end()
      })
      .catch(next)    
  })

module.exports = foldersRouter;
 