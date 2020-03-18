const path = require('path')
const express = require('express')
const xss = require('xss')
const NotesService = require('./notes-service')

const notesRouter = express.Router()
const jsonParser = express.json()

const serializeNote = note => ({
    id: note.id,
    name: xss(note.name),
    date_modified: note.date_modified,
    folderId: note.folderid,
    content: xss(note.content),
  })

notesRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')  
    NotesService.getAllNotes(knexInstance)
      .then(note => {
        res.json(note.map(serializeNote))
      })
      .catch(next)
  })
  .post(jsonParser, (req, res, next) => {
    console.log(req.body);
    const { name, folderid, date_modified, content } = req.body
    const newNote = { name, folderid, date_modified, content }
    for (const [key, value] of Object.entries(newNote)) 
       if (value == null) 
          return res.status(400).json({
            error: { message: `Missing '${key}' in request body` }
          })
    newNote.folderid = folderid 
    NotesService.insertNote(
      req.app.get('db'),
      newNote
    )
      .then(note => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${note.id}`))
          .json(serializeNote(note))
      })
      .catch(next)
  })

notesRouter
  .route('/:note_id')
  .all((req, res, next) => {
       NotesService.getById(
        req.app.get('db'),
        req.params.note_id
     )
      .then(note => {
        if (!note) {
            return res.status(404).json({
                 error: { message: `Note doesn't exist` }
               })
        }
          res.note = note // save the note for the next middleware
          next() // don't forget to call next so the next middleware happens!
        })
        .catch(next)
   })
   .get((req, res, next) => {
    res.json(serializeNote(res.note))
  })
  .delete((req, res, next) => {
    NotesService.deleteNote(
        req.app.get('db'),
        req.params.note_id
      )
        .then(() => {
           res.status(204).end()
        })
        .catch(next)
   })
   .patch(jsonParser, (req, res, next) => {
    const { name, folderid, content } = req.body;
    const noteToUpdate = { name, folderid, content };

    const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length;
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: `Request body must containe either 'note_name', 'folder_id' or 'content'`
        }
      });
    }
    console.log(noteToUpdate);
    console.log(req.params.note_id);
    const knexInstance = req.app.get('db')
    NotesService.updateNote(
        knexInstance, 
        req.params.note_id, 
        noteToUpdate
        )
      .then(numRowsAffected => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = notesRouter;