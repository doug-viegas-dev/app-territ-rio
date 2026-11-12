import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { onDocumentDeleted } from 'firebase-functions/v2/firestore'
import { apagarContaDoMembro } from './apagarContaDoMembro.js'

initializeApp()

export const apagarContaAoRemoverMembro = onDocumentDeleted(
  { document: 'members/{email}', retry: true },
  async (evento) => {
    const email = decodeURIComponent(evento.params.email).trim().toLowerCase()
    await apagarContaDoMembro(email, {
      membroExiste: async (e) => (await getFirestore().doc(`members/${e}`).get()).exists,
      uidDoEmail: async (e) => (await getAuth().getUserByEmail(e)).uid,
      apagarConta: (uid) => getAuth().deleteUser(uid),
    })
  },
)
