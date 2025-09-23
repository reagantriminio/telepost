import os
import subprocess
import tempfile
import shutil
from typing import List, Dict, Optional, Any
from django.conf import settings
import pydicom
from pydicom.errors import InvalidDicomError
import logging

logger = logging.getLogger('dicom_transfer')

class DICOMParser:
    """
    Service for parsing DICOM files and extracting metadata.
    """
    
    def parse_file(self, file_path: str) -> Optional[Dict]:
        """
        Parse a single DICOM file and extract metadata.
        
        Args:
            file_path: Path to the DICOM file
            
        Returns:
            Dictionary containing DICOM metadata or None if parsing fails
        """
        try:
            # Read DICOM file
            ds = pydicom.dcmread(file_path, force=True)
            
            # Extract metadata
            metadata = {
                'file_path': file_path,
                'patient_name': str(getattr(ds, 'PatientName', '')),
                'patient_id': str(getattr(ds, 'PatientID', '')),
                'patient_birth_date': str(getattr(ds, 'PatientBirthDate', '')),
                'patient_sex': str(getattr(ds, 'PatientSex', '')),
                'study_instance_uid': str(getattr(ds, 'StudyInstanceUID', '')),
                'study_description': str(getattr(ds, 'StudyDescription', '')),
                'study_date': str(getattr(ds, 'StudyDate', '')),
                'series_instance_uid': str(getattr(ds, 'SeriesInstanceUID', '')),
                'series_description': str(getattr(ds, 'SeriesDescription', '')),
                'series_number': str(getattr(ds, 'SeriesNumber', '')),
                'modality': str(getattr(ds, 'Modality', '')),
                'instance_number': str(getattr(ds, 'InstanceNumber', '')),
                'sop_instance_uid': str(getattr(ds, 'SOPInstanceUID', '')),
                'body_part_examined': str(getattr(ds, 'BodyPartExamined', '')),
                'institution_name': str(getattr(ds, 'InstitutionName', '')),
                'manufacturer': str(getattr(ds, 'Manufacturer', '')),
                'rows': getattr(ds, 'Rows', 0),
                'columns': getattr(ds, 'Columns', 0),
            }
            
            # Format dates
            if metadata['patient_birth_date']:
                try:
                    # DICOM date format is YYYYMMDD
                    date_str = metadata['patient_birth_date']
                    if len(date_str) == 8:
                        metadata['patient_birth_date'] = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
                except:
                    pass
            
            if metadata['study_date']:
                try:
                    date_str = metadata['study_date']
                    if len(date_str) == 8:
                        metadata['study_date'] = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"
                except:
                    pass
            
            return metadata
            
        except InvalidDicomError:
            logger.warning(f"Invalid DICOM file: {file_path}")
            return None
        except Exception as e:
            logger.error(f"Error parsing DICOM file {file_path}: {str(e)}")
            return None
    
    def group_by_patient_and_series(self, file_metadata_list: List[Dict]) -> List[Dict]:
        """
        Group DICOM file metadata by patient and series.
        
        Args:
            file_metadata_list: List of file metadata dictionaries
            
        Returns:
            List of patient dictionaries with nested series data
        """
        patients = {}
        
        for metadata in file_metadata_list:
            patient_key = metadata.get('patient_id') or metadata.get('patient_name') or 'Unknown'
            series_key = metadata.get('series_instance_uid') or 'Unknown'
            
            # Initialize patient if not exists
            if patient_key not in patients:
                patients[patient_key] = {
                    'id': patient_key,
                    'name': metadata.get('patient_name', 'Unknown Patient'),
                    'patient_id': metadata.get('patient_id', ''),
                    'birth_date': metadata.get('patient_birth_date', ''),
                    'sex': metadata.get('patient_sex', ''),
                    'series': {}
                }
            
            # Initialize series if not exists
            if series_key not in patients[patient_key]['series']:
                patients[patient_key]['series'][series_key] = {
                    'id': series_key,
                    'series_instance_uid': metadata.get('series_instance_uid', ''),
                    'description': metadata.get('series_description', ''),
                    'modality': metadata.get('modality', ''),
                    'series_number': metadata.get('series_number', ''),
                    'study_instance_uid': metadata.get('study_instance_uid', ''),
                    'study_description': metadata.get('study_description', ''),
                    'study_date': metadata.get('study_date', ''),
                    'body_part': metadata.get('body_part_examined', ''),
                    'institution': metadata.get('institution_name', ''),
                    'files': [],
                    'instance_count': 0
                }
            
            # Add file to series
            patients[patient_key]['series'][series_key]['files'].append(metadata)
            patients[patient_key]['series'][series_key]['instance_count'] += 1
        
        # Convert to list format expected by frontend
        result = []
        for patient_data in patients.values():
            # Convert series dict to list
            series_list = list(patient_data['series'].values())
            patient_data['series'] = series_list
            result.append(patient_data)
        
        # Sort patients by name
        result.sort(key=lambda p: p['name'])
        
        # Sort series within each patient by series number
        for patient in result:
            patient['series'].sort(key=lambda s: int(s.get('series_number', 0) or 0))
        
        return result

class DICOMTransferService:
    """
    Service for transferring DICOM files using DCMTK storescu.
    """
    
    def __init__(self):
        self.storescu_path = getattr(settings, 'STORESCU_PATH', 'storescu')
    
    def transfer_series(self, log_id: int, file_paths: List[str], destination) -> bool:
        """
        Transfer a series of DICOM files to a destination.

        Args:
            log_id: TransferLog ID for tracking
            file_paths: List of DICOM file paths
            destination: Destination model instance

        Returns:
            True if transfer successful, False otherwise
        """
        from .models import TransferLog

        # Initialize file lists outside try block for cleanup
        valid_files = []
        converted_files = []
        timeout_seconds = 300  # Default timeout

        try:
            # Get transfer log
            transfer_log = TransferLog.objects.get(id=log_id)  # type: ignore
            transfer_log.status = 'sending'
            transfer_log.save()

            # Validate files exist and convert to compatible transfer syntax

            for file_path in file_paths:
                if os.path.exists(file_path):
                    # Convert to Little Endian Explicit if needed
                    converted_path = self._convert_transfer_syntax(file_path)
                    if converted_path:
                        valid_files.append(file_path)
                        converted_files.append(converted_path)
                    else:
                        logger.warning(f"Failed to convert transfer syntax: {file_path}")
                else:
                    logger.warning(f"File not found: {file_path}")

            if not converted_files:
                transfer_log.mark_completed(
                    'failed',
                    error_message="No valid files found for transfer or conversion failed"
                )
                return False
            
            # Prepare storescu command with comprehensive transfer syntax support
            cmd = [
                self.storescu_path,
                '-aet', 'TELEPOST',
                '-aec', destination.ae_title,
                '--propose-uncompr',       # Propose uncompressed transfer syntax
                '--propose-little',        # Propose Little Endian Explicit
                '--propose-implicit',      # Propose Little Endian Implicit
                '--convert-to-explicit',   # Convert to explicit VR if needed
                '--timeout', '60',         # Increase timeout for large series
                destination.host,
                str(destination.port),
            ]

            # Add converted files to command
            cmd.extend(converted_files)
            
            logger.info(f"Starting DICOM transfer: {' '.join(cmd[:8])}... ({len(converted_files)} files)")

            # Execute storescu with longer timeout for large series
            timeout_seconds = max(300, len(converted_files) * 2)  # At least 5 min, or 2 sec per file
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout_seconds
            )

            total_size = sum(os.path.getsize(fp) for fp in converted_files if os.path.exists(fp))

            if result.returncode == 0:
                # Success
                transfer_log.bytes_transferred = total_size
                transfer_log.mark_completed(
                    'success',
                    files_transferred=len(converted_files),
                    bytes_transferred=total_size,
                    storescu_output=result.stdout
                )
                logger.info(f"Transfer completed successfully: {len(converted_files)} files")
                return True
            else:
                # Failure
                error_msg = result.stderr or "Unknown storescu error"
                transfer_log.mark_completed(
                    'failed',
                    error_message=error_msg,
                    storescu_output=result.stdout,
                    storescu_error=result.stderr
                )
                logger.error(f"Transfer failed: {error_msg}")
                return False
                
        except subprocess.TimeoutExpired:
            error_msg = f"Transfer timed out after {timeout_seconds} seconds"
            transfer_log.mark_completed('failed', error_message=error_msg)
            logger.error(error_msg)
            return False
            
        except Exception as e:
            error_msg = f"Transfer error: {str(e)}"
            transfer_log.mark_completed('failed', error_message=error_msg)
            logger.error(error_msg)
            return False
        
        finally:
            # Clean up temporary files (both original and converted)
            self._cleanup_files(file_paths + converted_files)
    
    def _cleanup_files(self, file_paths: List[str]):
        """
        Clean up temporary DICOM files after transfer.
        """
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    # Get the temporary directory (should be the parent directory)
                    temp_dir = os.path.dirname(file_path)
                    if 'dicom_import_' in temp_dir:
                        # Remove the entire temp directory
                        shutil.rmtree(temp_dir, ignore_errors=True)
                        break  # Only need to remove once per session
            except Exception as e:
                logger.warning(f"Failed to cleanup file {file_path}: {str(e)}")

    def _convert_transfer_syntax(self, file_path: str) -> Optional[str]:
        """
        Convert DICOM file to Little Endian Explicit transfer syntax if needed.

        Args:
            file_path: Path to original DICOM file

        Returns:
            Path to converted file or original file if no conversion needed
        """
        try:
            # Configure pydicom to handle malformed data gracefully
            import pydicom.config
            original_setting = pydicom.config.convert_wrong_length_to_UN
            pydicom.config.convert_wrong_length_to_UN = True

            try:
                # Read original file with error handling
                ds = pydicom.dcmread(file_path, force=True)

                # Check if already in Little Endian Explicit
                if hasattr(ds, 'file_meta') and hasattr(ds.file_meta, 'TransferSyntaxUID'):
                    current_syntax = str(ds.file_meta.TransferSyntaxUID)
                    # Little Endian Explicit UID
                    if current_syntax == '1.2.840.10008.1.2.1':
                        return file_path  # No conversion needed

                # Convert to Little Endian Explicit
                ds.file_meta.TransferSyntaxUID = '1.2.840.10008.1.2.1'
                ds.is_little_endian = True
                ds.is_implicit_VR = False

                # Create converted file path
                base_dir = os.path.dirname(file_path)
                base_name = os.path.basename(file_path)
                converted_path = os.path.join(base_dir, f"converted_{base_name}")

                # Save converted file with error handling
                ds.save_as(converted_path, write_like_original=False)

                logger.info(f"Converted DICOM transfer syntax: {file_path} -> {converted_path}")
                return converted_path

            finally:
                # Restore original pydicom setting
                pydicom.config.convert_wrong_length_to_UN = original_setting

        except Exception as e:
            logger.error(f"Failed to convert transfer syntax for {file_path}: {str(e)}")
            # Return original file as fallback - let storescu handle it
            return file_path

    def test_destination(self, destination) -> Dict[str, Any]:
        """
        Test connectivity to a DICOM destination using C-ECHO.
        
        Args:
            destination: Destination model instance
            
        Returns:
            Dictionary with test results
        """
        try:
            # Use echoscu from DCMTK to test connection
            cmd = [
                'echoscu',
                '-aet', 'TELEPOST',
                '-aec', destination.ae_title,
                destination.host,
                str(destination.port)
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30  # 30 second timeout
            )
            
            success = result.returncode == 0
            
            return {
                'success': success,
                'message': 'Connection successful' if success else 'Connection failed',
                'details': result.stdout if success else result.stderr,
                'response_time': None  # Could be extracted from echoscu output
            }
            
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'message': 'Connection timed out',
                'details': 'No response after 30 seconds',
                'response_time': None
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Test failed: {str(e)}',
                'details': '',
                'response_time': None
            } 