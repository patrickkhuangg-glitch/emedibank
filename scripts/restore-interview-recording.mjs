import {S3Client} from '@aws-sdk/client-s3';
import {clients} from './lib/interview-operator.mjs';
import {restoreRecordingBackup} from './lib/recording-backup-restore.mjs';
const [attemptId,mode]=process.argv.slice(2);
if(!attemptId||!['--check-only','--restore'].includes(mode))throw Error('Usage: node scripts/restore-interview-recording.mjs ATTEMPT_UUID --check-only|--restore');
const account=process.env.INTERVIEW_BACKUP_R2_ACCOUNT_ID,bucket=process.env.INTERVIEW_BACKUP_R2_BUCKET;
const accessKeyId=process.env.INTERVIEW_BACKUP_R2_ACCESS_KEY_ID,secretAccessKey=process.env.INTERVIEW_BACKUP_R2_SECRET_ACCESS_KEY;
if(!account||!/^[a-f0-9]{32}$/.test(account)||!bucket||!accessKeyId||!secretAccessKey)throw Error('Configure the four INTERVIEW_BACKUP_R2 environment variables in the operator shell');
const s3=new S3Client({region:'auto',endpoint:`https://${account}.r2.cloudflarestorage.com`,credentials:{accessKeyId,secretAccessKey},requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'});
try{const {admin:db}=await clients();console.log(JSON.stringify(await restoreRecordingBackup({db,s3,bucket,attemptId,restore:mode==='--restore'})));}
finally{s3.destroy();}
